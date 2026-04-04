import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

const REGION = process.env.AWS_REGION || 'eu-west-1'
const BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || ''
const PUBLISH_LAMBDA_ARN = process.env.PUBLISH_LAMBDA_ARN || ''
const STRATEGIST_LAMBDA_NAME = process.env.STRATEGIST_TRIGGER_LAMBDA_NAME || ''

let _s3: S3Client | null = null
let _dynamo: DynamoDBClient | null = null
let _lambda: LambdaClient | null = null

function getS3(): S3Client {
  _s3 ??= new S3Client({ region: REGION })
  return _s3
}

function getDynamo(): DynamoDBClient {
  _dynamo ??= new DynamoDBClient({ region: REGION })
  return _dynamo
}

function getLambda(): LambdaClient {
  _lambda ??= new LambdaClient({ region: REGION })
  return _lambda
}

type PipelineState = 'pending' | 'processing' | 'review' | 'published' | 'rejected' | 'failed'

async function s3ObjectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await getS3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

async function fetchDynamoMetadata(
  slug: string,
): Promise<Record<string, { S?: string }> | null> {
  try {
    const result = await getDynamo().send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: { S: `ARTICLE#${slug}` },
          sk: { S: 'METADATA' },
        },
        ProjectionExpression: '#s, title, updatedAt',
        ExpressionAttributeNames: { '#s': 'status' },
      }),
    )
    return (result.Item as Record<string, { S?: string }>) ?? null
  } catch {
    return null
  }
}

function derivePipelineState(
  dynamoStatus: string | undefined,
  s3ReviewExists: boolean,
): PipelineState {
  if (dynamoStatus === 'published') return 'published'
  if (dynamoStatus === 'rejected') return 'rejected'
  if (dynamoStatus === 'failed') return 'failed'
  if (dynamoStatus === 'review') return 'review'

  if (dynamoStatus === 'processing' && s3ReviewExists) return 'review'
  if (dynamoStatus === 'processing') return 'processing'
  if (dynamoStatus === 'draft' && s3ReviewExists) return 'review'
  if (!dynamoStatus) return 'pending'

  return 'failed'
}

export const getPipelineStatusFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const slug = z.string().parse(ctx.data)

    if (!BUCKET_NAME || !TABLE_NAME) {
      throw new Error('Server misconfiguration: ASSETS_BUCKET_NAME and DYNAMODB_TABLE_NAME must be set')
    }

    try {
      const [dynamoItem, s3ReviewExists] = await Promise.all([
        fetchDynamoMetadata(slug),
        s3ObjectExists(BUCKET_NAME, `review/${slug}.mdx`),
      ])

      const dynamoStatus = dynamoItem?.status?.S
      const title = dynamoItem?.title?.S
      const updatedAt = dynamoItem?.updatedAt?.S

      const pipelineState = derivePipelineState(dynamoStatus, s3ReviewExists)

      return {
        slug,
        pipelineState,
        s3ReviewExists,
        dynamoMetadata: dynamoItem !== null,
        title,
        updatedAt,
        statusRaw: dynamoStatus,
      }
    } catch {
      return {
        slug,
        pipelineState: 'failed' as PipelineState,
        s3ReviewExists: false,
        dynamoMetadata: false,
      }
    }
  })

export const triggerPipelineActionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const data = z.object({
      slug: z.string(),
      action: z.enum(['approve', 'reject']),
    }).parse(ctx.data)

    if (!PUBLISH_LAMBDA_ARN) {
      throw new Error('Server misconfiguration: PUBLISH_LAMBDA_ARN must be set')
    }

    const payload = JSON.stringify({ slug: data.slug, action: data.action })

    const result = await getLambda().send(
      new InvokeCommand({
        FunctionName: PUBLISH_LAMBDA_ARN,
        Payload: new TextEncoder().encode(payload),
        InvocationType: 'RequestResponse',
      }),
    )

    if (result.FunctionError) {
      const errorPayload = result.Payload
        ? JSON.parse(new TextDecoder().decode(result.Payload)) as { errorMessage?: string }
        : { errorMessage: 'Unknown Lambda error' }

      throw new Error(errorPayload.errorMessage ?? 'Unknown Lambda error')
    }

    return {
      success: true,
      slug: data.slug,
      action: data.action,
    }
  })

export const triggerStrategistCoachFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const data = z.object({
      slug: z.string(),
      coachingType: z.enum(['GENERAL', 'TECHNICAL', 'BEHAVIOURAL', 'CULTURAL']),
      targetCompany: z.string(),
      targetRole: z.string(),
      resumeId: z.string().optional(),
    }).parse(ctx.data)

    if (!STRATEGIST_LAMBDA_NAME) {
      throw new Error('Server misconfiguration: STRATEGIST_TRIGGER_LAMBDA_NAME must be set')
    }

    const payload = {
      pipelineId: `COACH-${Date.now()}`,
      slug: data.slug,
      context: {
        coachingType: data.coachingType,
        targetCompany: data.targetCompany,
        targetRole: data.targetRole,
        resumeId: data.resumeId,
      },
    }

    const result = await getLambda().send(
      new InvokeCommand({
        FunctionName: STRATEGIST_LAMBDA_NAME,
        InvocationType: 'RequestResponse',
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      }),
    )

    if (result.FunctionError) {
      const errorPayload = result.Payload
        ? new TextDecoder().decode(result.Payload)
        : 'Unknown Lambda error'
      throw new Error(`Lambda execution failed: ${errorPayload}`)
    }

    const responsePayload = result.Payload
      ? JSON.parse(new TextDecoder().decode(result.Payload)) as {
          statusCode?: number
          body?: string
        }
      : null

    if (!responsePayload?.body) {
      throw new Error('Empty response from Trigger Lambda')
    }

    return JSON.parse(responsePayload.body)
  })
