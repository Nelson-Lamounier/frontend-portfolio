/**
 * Admin Pipeline Status API
 *
 * GET /api/admin/pipeline-status?slug={slug} — Lightweight endpoint
 * for polling the Bedrock pipeline progress. Checks DynamoDB for the
 * article metadata record and S3 for the review output.
 *
 * Pipeline states:
 *   - pending:    No DynamoDB record found (pipeline hasn't started yet)
 *   - processing: DynamoDB status="processing" (trigger Lambda fired)
 *   - review:     DynamoDB status="review" or S3 review/{slug}.mdx exists
 *   - published:  DynamoDB status="published"
 *   - rejected:   DynamoDB status="rejected"
 *   - failed:     An error occurred during status check
 *
 * Env vars:
 *   - ASSETS_BUCKET_NAME:    S3 bucket for content
 *   - DYNAMODB_TABLE_NAME:   DynamoDB table for article metadata
 *   - AWS_REGION:            AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { auth } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'
const BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || ''

// ---------------------------------------------------------------------------
// Pipeline state type
// ---------------------------------------------------------------------------

/** All possible Bedrock pipeline states */
type PipelineState = 'pending' | 'processing' | 'review' | 'published' | 'rejected' | 'failed'

/** Response shape for the pipeline status endpoint */
interface PipelineStatusResponse {
  readonly slug: string
  readonly pipelineState: PipelineState
  readonly s3ReviewExists: boolean
  readonly dynamoMetadata: boolean
  readonly title?: string
  readonly updatedAt?: string
  readonly statusRaw?: string
}

// ---------------------------------------------------------------------------
// Singleton AWS clients
// ---------------------------------------------------------------------------

let _s3: S3Client | null = null
let _dynamo: DynamoDBClient | null = null

/** @returns Shared S3 client */
function getS3(): S3Client {
  _s3 ??= new S3Client({ region: REGION })
  return _s3
}

/** @returns Shared DynamoDB client */
function getDynamo(): DynamoDBClient {
  _dynamo ??= new DynamoDBClient({ region: REGION })
  return _dynamo
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether an S3 object exists at the given key.
 *
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns True if the object exists
 */
async function s3ObjectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await getS3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

/**
 * Fetch the DynamoDB metadata record for a given slug.
 *
 * @param slug - Article slug
 * @returns The raw DynamoDB item attributes, or null if not found
 */
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

/**
 * Derives the pipeline state from DynamoDB status and S3 review object.
 *
 * @param dynamoStatus - Raw status value from DynamoDB
 * @param s3ReviewExists - Whether the review S3 object exists
 * @returns Resolved PipelineState
 */
function derivePipelineState(
  dynamoStatus: string | undefined,
  s3ReviewExists: boolean,
): PipelineState {
  // If DynamoDB has a known terminal status, use it directly
  if (dynamoStatus === 'published') return 'published'
  if (dynamoStatus === 'rejected') return 'rejected'
  if (dynamoStatus === 'failed') return 'failed'
  if (dynamoStatus === 'review') return 'review'

  // If still processing but S3 review output exists, pipeline has finished
  if (dynamoStatus === 'processing' && s3ReviewExists) return 'review'

  // DynamoDB says processing
  if (dynamoStatus === 'processing') return 'processing'

  // If DynamoDB has draft status but review file exists, it's ready
  if (dynamoStatus === 'draft' && s3ReviewExists) return 'review'

  // No record found — pipeline hasn't started or is very early
  if (!dynamoStatus) return 'pending'

  // Fallback for any unknown status — treat as failed rather than polling forever
  return 'failed'
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/pipeline-status?slug={slug}
 *
 * Checks DynamoDB and S3 to determine the current pipeline state.
 * Designed for fast polling (< 200ms per call).
 *
 * @param request - Request with slug query parameter
 * @returns JSON with pipeline state and metadata
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<PipelineStatusResponse | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  // Extract slug from query params
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug || typeof slug !== 'string' || slug.length === 0) {
    return NextResponse.json(
      { error: 'Missing required query parameter: slug' },
      { status: 400 },
    )
  }

  // Validate env vars
  if (!BUCKET_NAME || !TABLE_NAME) {
    return NextResponse.json(
      { error: 'Server misconfiguration: ASSETS_BUCKET_NAME and DYNAMODB_TABLE_NAME must be set' },
      { status: 500 },
    )
  }

  try {
    // Parallel checks: DynamoDB record + S3 review object
    const [dynamoItem, s3ReviewExists] = await Promise.all([
      fetchDynamoMetadata(slug),
      s3ObjectExists(BUCKET_NAME, `review/${slug}.mdx`),
    ])

    const dynamoStatus = dynamoItem?.status?.S
    const title = dynamoItem?.title?.S
    const updatedAt = dynamoItem?.updatedAt?.S

    const pipelineState = derivePipelineState(dynamoStatus, s3ReviewExists)

    return NextResponse.json({
      slug,
      pipelineState,
      s3ReviewExists,
      dynamoMetadata: dynamoItem !== null,
      title,
      updatedAt,
      statusRaw: dynamoStatus,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[pipeline-status] ❌ Error checking status for "${slug}":`, message)

    return NextResponse.json({
      slug,
      pipelineState: 'failed' as PipelineState,
      s3ReviewExists: false,
      dynamoMetadata: false,
    })
  }
}
