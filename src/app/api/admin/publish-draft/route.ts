/**
 * Admin Publish Draft API — Upload Only
 *
 * POST /api/admin/publish-draft — Uploads a Markdown draft file to
 * the S3 `drafts/` prefix. The S3 event notification then triggers
 * the Bedrock pipeline Lambda automatically (Option C).
 *
 * Flow:
 *   1. Validate infrastructure env vars (ASSETS_BUCKET_NAME)
 *   2. Upload .md content → s3://{bucket}/drafts/{filename}.md
 *   3. Return immediately — pipeline tracking is done via /pipeline-status
 *
 * Env vars (injected by deploy.py via K8s secret):
 *   - ASSETS_BUCKET_NAME: S3 bucket for drafts/published content
 *   - AWS_REGION:         AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Assets bucket name — injected by deploy.py from SSM at deploy time */
const BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''

// ---------------------------------------------------------------------------
// Singleton AWS client
// ---------------------------------------------------------------------------

let _s3: S3Client | null = null

/** @returns Shared S3 client */
function getS3(): S3Client {
  _s3 ??= new S3Client({ region: REGION })
  return _s3
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
 * Uploads a Markdown draft to S3 and returns immediately.
 * The S3 event notification triggers the pipeline Lambda, which
 * writes `status: "processing"` to DynamoDB. The frontend then
 * polls `/api/admin/pipeline-status?slug=` for progress.
 *
 * @param request - JSON body with `fileName` and `content`
 * @returns JSON indicating the upload result
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
    if (!BUCKET_NAME) {
      console.error('[publish-draft] Missing ASSETS_BUCKET_NAME env var')
      return NextResponse.json(
        { error: 'Server misconfiguration: ASSETS_BUCKET_NAME must be set' },
        { status: 500 },
      )
    }

    // ------------------------------------------------------------------
    // Step 2: Upload .md to S3 drafts/ prefix
    // ------------------------------------------------------------------
    const s3Key = fileName.endsWith('.md')
      ? `drafts/${fileName}`
      : `drafts/${fileName}.md`

    console.log(`[publish-draft] Uploading to s3://${BUCKET_NAME}/${s3Key}`)

    await getS3().send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: body.content,
        ContentType: 'text/markdown',
      }),
    )

    console.log(`[publish-draft] ✅ Upload complete — S3 event will trigger pipeline`)

    // ------------------------------------------------------------------
    // Step 3: Return immediately — pipeline tracked via /pipeline-status
    // ------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      slug,
      message: 'Draft uploaded — Bedrock pipeline triggered automatically',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[publish-draft] ❌ Failed to upload "${slug}":`, message)

    return NextResponse.json(
      {
        success: false,
        slug,
        message: 'Failed to upload draft to S3',
        error: message,
      },
      { status: 500 },
    )
  }
}
