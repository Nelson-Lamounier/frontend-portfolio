/**
 * Admin Publish Draft API
 *
 * POST /api/admin/publish-draft — Uploads a Markdown draft file to
 * the S3 drafts/ prefix, triggering the Bedrock publisher Lambda.
 * Polls for completion by checking the published/ S3 prefix and
 * DynamoDB metadata record.
 *
 * Flow:
 *   1. Validate infrastructure env vars (ASSETS_BUCKET_NAME, DYNAMODB_TABLE_NAME)
 *   2. Upload .md content → s3://{bucket}/drafts/{filename}.md
 *   3. Poll s3://{bucket}/published/{slug}.mdx for up to 3 minutes
 *   4. Verify DynamoDB METADATA record exists
 *   5. Return success/failure JSON
 *
 * Env vars (injected by deploy.py via K8s secret):
 *   - ASSETS_BUCKET_NAME:    S3 bucket for drafts/published content
 *   - DYNAMODB_TABLE_NAME:   DynamoDB table for article metadata
 *   - AWS_REGION:            AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import {
  DynamoDBClient,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb'
import { auth } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Assets bucket name — injected by deploy.py from SSM at deploy time */
const BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''

/** DynamoDB content table — injected by deploy.py from SSM at deploy time */
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || ''

/** Maximum polling duration in milliseconds (3 minutes) */
const MAX_POLL_MS = 180_000

/** Interval between S3 head-object checks (15 seconds) */
const POLL_INTERVAL_MS = 15_000

/** Initial delay to allow S3 event delivery + Lambda cold start (20s) */
const INITIAL_DELAY_MS = 20_000

// ---------------------------------------------------------------------------
// Singleton AWS clients
// ---------------------------------------------------------------------------

let _s3: S3Client | null = null
let _dynamo: DynamoDBClient | null = null

/** @returns Shared S3 client */
function getS3(): S3Client {
  if (!_s3) _s3 = new S3Client({ region: REGION })
  return _s3
}

/** @returns Shared DynamoDB client */
function getDynamo(): DynamoDBClient {
  if (!_dynamo) _dynamo = new DynamoDBClient({ region: REGION })
  return _dynamo
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for a given number of milliseconds.
 *
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check whether an S3 object exists at the given key.
 *
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns True if the object exists, false otherwise
 */
async function s3ObjectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await getS3().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    )
    return true
  } catch {
    return false
  }
}

/**
 * Check whether a DynamoDB metadata record exists for the given slug.
 *
 * @param tableName - DynamoDB table name
 * @param slug - Article slug
 * @returns True if the METADATA record exists
 */
async function dynamoMetadataExists(
  tableName: string,
  slug: string,
): Promise<boolean> {
  try {
    const result = await getDynamo().send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          pk: { S: `ARTICLE#${slug}` },
          sk: { S: 'METADATA' },
        },
        ProjectionExpression: 'pk',
      }),
    )
    return result.Item !== undefined
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/** Request body schema for the publish-draft endpoint */
interface PublishDraftRequestBody {
  /** Original filename (e.g. 'my-article.md') */
  readonly fileName: string
  /** Full Markdown content of the draft */
  readonly content: string
}

/** Successful response payload */
interface PublishDraftSuccessResponse {
  readonly success: true
  readonly slug: string
  readonly message: string
  readonly details: {
    readonly s3Published: boolean
    readonly dynamoMetadata: boolean
  }
}

/** Failure response payload */
interface PublishDraftErrorResponse {
  readonly success: false
  readonly slug: string
  readonly message: string
  readonly error: string
}

type PublishDraftResponse = PublishDraftSuccessResponse | PublishDraftErrorResponse

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/publish-draft
 *
 * Uploads a Markdown draft to S3 and polls for Bedrock publisher completion.
 *
 * @param request - JSON body with `fileName` and `content`
 * @returns JSON indicating success or failure of the publishing pipeline
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<PublishDraftResponse | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  // Parse and validate request body
  let body: PublishDraftRequestBody
  try {
    body = (await request.json()) as PublishDraftRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (!body.fileName || typeof body.fileName !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: fileName' },
      { status: 400 },
    )
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: content' },
      { status: 400 },
    )
  }

  // Derive slug from filename (strip .md extension)
  const fileName = body.fileName.trim()
  const slug = fileName.replace(/\.md$/i, '')
  if (slug.length === 0 || slug.length > 200) {
    return NextResponse.json(
      { error: 'Invalid filename format' },
      { status: 400 },
    )
  }

  try {
    // ------------------------------------------------------------------
    // Step 1: Validate infrastructure env vars
    // ------------------------------------------------------------------
    if (!BUCKET_NAME || !TABLE_NAME) {
      console.error('[publish-draft] Missing infrastructure env vars:', {
        ASSETS_BUCKET_NAME: BUCKET_NAME ? '✅' : '❌ MISSING',
        DYNAMODB_TABLE_NAME: TABLE_NAME ? '✅' : '❌ MISSING',
      })
      return NextResponse.json(
        { error: 'Server misconfiguration: ASSETS_BUCKET_NAME and DYNAMODB_TABLE_NAME must be set' },
        { status: 500 },
      )
    }

    console.log(`[publish-draft] Bucket: ${BUCKET_NAME}, Table: ${TABLE_NAME}`)

    // ------------------------------------------------------------------
    // Step 2: Upload .md to S3 drafts/ prefix
    // ------------------------------------------------------------------
    const s3Key = `drafts/${fileName.endsWith('.md') ? fileName : `${fileName}.md`}`

    console.log(`[publish-draft] Uploading to s3://${BUCKET_NAME}/${s3Key}`)

    await getS3().send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: body.content,
        ContentType: 'text/markdown',
      }),
    )

    console.log(`[publish-draft] Upload complete — waiting for Lambda processing...`)

    // ------------------------------------------------------------------
    // Step 3: Poll for published output (S3 + DynamoDB)
    // ------------------------------------------------------------------
    const publishedKey = `published/${slug}.mdx`
    let s3Published = false
    let dynamoMetadata = false

    // Wait for S3 event delivery + Lambda cold start
    await sleep(INITIAL_DELAY_MS)

    const startTime = Date.now()
    while (Date.now() - startTime < MAX_POLL_MS) {
      console.log(`[publish-draft] Polling for ${publishedKey}...`)

      s3Published = await s3ObjectExists(BUCKET_NAME, publishedKey)
      if (s3Published) {
        dynamoMetadata = await dynamoMetadataExists(TABLE_NAME, slug)
        break
      }

      await sleep(POLL_INTERVAL_MS)
    }

    // ------------------------------------------------------------------
    // Step 4: Build response
    // ------------------------------------------------------------------
    if (s3Published) {
      console.log(`[publish-draft] ✅ Article "${slug}" published successfully`)
      return NextResponse.json({
        success: true,
        slug,
        message: 'Article created successfully',
        details: {
          s3Published,
          dynamoMetadata,
        },
      })
    }

    // Timed out — Lambda did not produce output within the window
    console.error(`[publish-draft] ⏱ Timeout waiting for "${slug}" — Lambda may still be processing`)
    return NextResponse.json({
      success: false,
      slug,
      message: 'Bedrock processing timed out — the article may still be processing. Check /admin/drafts in a few minutes.',
      error: `Timeout after ${MAX_POLL_MS / 1000}s waiting for published/${slug}.mdx`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[publish-draft] ❌ Failed to publish "${slug}":`, message)

    return NextResponse.json(
      {
        success: false,
        slug,
        message: 'Publishing pipeline failed',
        error: message,
      },
      { status: 500 },
    )
  }
}
