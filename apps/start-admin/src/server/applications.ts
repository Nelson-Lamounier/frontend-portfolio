import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import type { ApplicationSummary, ApplicationStatus, ApplicationDetail, AnalysisMetadata, ResumeSuggestions } from '@/lib/types/applications.types'
import type { ResumeData } from '@/lib/resumes/resume-data'

const REGION = process.env.AWS_REGION || 'eu-west-1'
const TABLE_NAME = process.env.STRATEGIST_TABLE_NAME || ''
const GSI1_INDEX = 'gsi1-status-date'

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'analysing',
  'analysis-ready',
  'failed',
  'interview-prep',
  'applied',
  'interviewing',
  'offer-received',
  'accepted',
  'withdrawn',
  'rejected',
])

let _docClient: DynamoDBDocumentClient | null = null

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const ddbClient = new DynamoDBClient({ region: REGION })
    _docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    })
  }
  return _docClient
}

async function queryByStatus(status: string): Promise<ApplicationSummary[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: GSI1_INDEX,
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `APP_STATUS#${status}`,
    },
    ScanIndexForward: false, // Newest first
  })

  const result = await getDocClient().send(command)

  return (result.Items ?? []).map((item) => ({
    slug: String(item['applicationSlug'] ?? item['slug'] ?? ''),
    targetCompany: String(item['targetCompany'] ?? ''),
    targetRole: String(item['targetRole'] ?? ''),
    status: String(item['status'] ?? 'analysing') as ApplicationStatus,
    fitRating: item['fitRating'] as ApplicationSummary['fitRating'],
    recommendation: item['recommendation'] as ApplicationSummary['recommendation'],
    interviewStage: String(item['interviewStage'] ?? 'applied') as ApplicationSummary['interviewStage'],
    costUsd: item['costUsd'] as number | undefined,
    createdAt: String(item['createdAt'] ?? ''),
    updatedAt: String(item['updatedAt'] ?? ''),
  }))
}

type DynamoRecord = Record<string, unknown>

function selectLatest(current: DynamoRecord | null, candidate: DynamoRecord): DynamoRecord {
  if (!current) return candidate
  const currentTs = String(current['createdAt'] ?? '')
  const candidateTs = String(candidate['createdAt'] ?? '')
  return candidateTs > currentTs ? candidate : current
}

function assembleDetail(
  slug: string,
  metadata: DynamoRecord,
  analysisRecord: DynamoRecord | null,
  interviewRecord: DynamoRecord | null,
  tailoredResumeRecord: DynamoRecord | null,
): ApplicationDetail {
  return {
    slug,
    targetCompany: String(metadata['targetCompany'] ?? ''),
    targetRole: String(metadata['targetRole'] ?? ''),
    status: String(metadata['status'] ?? 'analysing') as ApplicationDetail['status'],
    interviewStage: String(metadata['interviewStage'] ?? 'applied') as ApplicationDetail['interviewStage'],
    createdAt: String(metadata['createdAt'] ?? ''),
    updatedAt: String(metadata['updatedAt'] ?? ''),
    context: {
      pipelineId: String(metadata['pipelineId'] ?? ''),
      cumulativeInputTokens: Number(metadata['cumulativeInputTokens'] ?? 0),
      cumulativeOutputTokens: Number(metadata['cumulativeOutputTokens'] ?? 0),
      cumulativeThinkingTokens: Number(metadata['cumulativeThinkingTokens'] ?? 0),
      cumulativeCostUsd: Number(metadata['cumulativeCostUsd'] ?? 0),
    },
    research: (analysisRecord?.['research'] ?? null) as ApplicationDetail['research'],
    analysis: analysisRecord
      ? {
          analysisXml: String(analysisRecord['analysisXml'] ?? ''),
          coverLetter: analysisRecord['coverLetter'] ? String(analysisRecord['coverLetter']) : null,
          metadata: (analysisRecord['analysisMetadata'] ?? {
            overallFitRating: 'STRETCH' as const,
            applicationRecommendation: 'APPLY_WITH_CAVEATS' as const,
          }) as AnalysisMetadata,
          resumeSuggestions: (analysisRecord['resumeSuggestions'] ?? {
            additions: 0,
            reframes: 0,
            eslCorrections: 0,
            summary: '',
          }) as ResumeSuggestions,
          tailoredResume: (tailoredResumeRecord?.['tailoredResume'] ?? undefined) as ResumeData | undefined,
        }
      : null,
    interviewPrep: (interviewRecord?.['coaching'] ?? null) as ApplicationDetail['interviewPrep'],
  }
}

export const getApplicationsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    if (!TABLE_NAME) {
      throw new Error('STRATEGIST_TABLE_NAME must be set')
    }

    const statusParam = (ctx.data && typeof ctx.data === 'object' && 'status' in ctx.data) ? ctx.data.status : 'all'

    if (statusParam === 'all') {
      const statusKeys = [...VALID_STATUSES]
      const results = await Promise.all(
        statusKeys.map((s) => queryByStatus(s)),
      )
      return results
        .flat()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }

    if (!VALID_STATUSES.has(statusParam)) {
      throw new Error(`Invalid status: ${statusParam}`)
    }
    return await queryByStatus(statusParam)
  })

export const getApplicationDetailFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    if (!TABLE_NAME) {
      throw new Error('STRATEGIST_TABLE_NAME must be set')
    }

    const slug = z.string().parse(ctx.data)

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `APPLICATION#${slug}`,
      },
    })

    const result = await getDocClient().send(command)
    const items = result.Items ?? []

    if (items.length === 0) {
      throw new Error(`Application not found: ${slug}`)
    }

    let metadata: DynamoRecord | null = null
    let analysis: DynamoRecord | null = null
    let interview: DynamoRecord | null = null
    let tailoredResume: DynamoRecord | null = null

    for (const item of items) {
      const sk = String(item['sk'] ?? '')
      if (sk === 'METADATA') {
        metadata = item
      } else if (sk.startsWith('ANALYSIS#')) {
        analysis = selectLatest(analysis, item)
      } else if (sk.startsWith('INTERVIEW#')) {
        interview = selectLatest(interview, item)
      } else if (sk.startsWith('TAILORED_RESUME#')) {
        tailoredResume = selectLatest(tailoredResume, item)
      }
    }

    if (!metadata) {
      throw new Error(`Metadata record not found for: ${slug}`)
    }

    return assembleDetail(slug, metadata, analysis, interview, tailoredResume)
  })

export const deleteApplicationFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    if (!TABLE_NAME) {
      throw new Error('STRATEGIST_TABLE_NAME must be set')
    }

    const slug = z.string().parse(ctx.data)

    const queryCmd = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `APPLICATION#${slug}` },
    })
    const { Items } = await getDocClient().send(queryCmd)
    if (!Items || Items.length === 0) {
      return { success: true }
    }

    const deleteRequests = Items.map((item) => ({
      DeleteRequest: {
        Key: { pk: item.pk, sk: item.sk },
      },
    }))

    const batchCmd = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: deleteRequests.slice(0, 25),
      },
    })
    await getDocClient().send(batchCmd)

    return { success: true }
  })

export const updateApplicationStatusFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    if (!TABLE_NAME) {
      throw new Error('STRATEGIST_TABLE_NAME must be set')
    }

    const data = z.object({
      slug: z.string(),
      status: z.string(),
      interviewStage: z.string().optional(),
    }).parse(ctx.data)

    if (!VALID_STATUSES.has(data.status)) {
      throw new Error(`Invalid status: ${data.status}`)
    }

    const now = new Date().toISOString()
    const datePrefix = now.slice(0, 10)

    const updateExprParts = [
      '#st = :status',
      'updatedAt = :now',
      'gsi1pk = :gsi1pk',
      'gsi1sk = :gsi1sk',
    ]
    const expressionValues: Record<string, unknown> = {
      ':status': data.status,
      ':now': now,
      ':gsi1pk': `APP_STATUS#${data.status}`,
      ':gsi1sk': `${datePrefix}#${data.slug}`,
    }
    const expressionNames: Record<string, string> = {
      '#st': 'status',
    }

    if (data.interviewStage) {
      updateExprParts.push('interviewStage = :stage')
      expressionValues[':stage'] = data.interviewStage
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `APPLICATION#${data.slug}`,
        sk: 'METADATA',
      },
      UpdateExpression: `SET ${updateExprParts.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW',
    })

    await getDocClient().send(command)

    return {
      success: true,
      status: data.status,
    }
  })
