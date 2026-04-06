/**
 * @format
 * Draft publish server function for the admin dashboard.
 *
 * Handles uploading a markdown draft to S3 and invoking the
 * Article Pipeline Trigger Lambda to start the Bedrock article
 * generation Step Functions state machine.
 *
 * Protected by JWT authentication via `requireAuth()`.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { requireAuth } from './auth-guard'

// =============================================================================
// Constants
// =============================================================================

const REGION = process.env.AWS_REGION || 'eu-west-1'
const BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const ARTICLE_TRIGGER_ARN = process.env.ARTICLE_TRIGGER_ARN || ''

// =============================================================================
// AWS Client Singletons (Lazy)
// =============================================================================

let _s3: S3Client | null = null
let _lambda: LambdaClient | null = null

function getS3(): S3Client {
  _s3 ??= new S3Client({ region: REGION })
  return _s3
}

function getLambda(): LambdaClient {
  _lambda ??= new LambdaClient({ region: REGION })
  return _lambda
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Derives a URL-safe slug from a filename.
 *
 * @param fileName - Raw filename (e.g. `my-article.md`)
 * @returns Slugified base without extension
 */
function deriveSlug(fileName: string): string {
  return fileName
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// =============================================================================
// Input Schema
// =============================================================================

const publishDraftSchema = z.object({
  fileName: z.string().min(1, 'Filename is required'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
})

// =============================================================================
// Response Type
// =============================================================================

interface PublishDraftResult {
  readonly success: boolean
  readonly slug: string
  readonly message: string
  readonly error?: string
}

// =============================================================================
// Server Function
// =============================================================================

/**
 * Uploads a markdown draft to S3 and triggers the article pipeline.
 *
 * 1. Derives a slug from the filename
 * 2. Uploads the content to `drafts/<slug>.md` in S3
 * 3. Invokes the Article Pipeline Trigger Lambda
 * 4. Returns the slug for frontend pipeline tracking
 *
 * @param data.fileName - Draft filename (e.g. `my-article.md`)
 * @param data.content - Raw markdown content
 * @returns Success response with slug for pipeline tracking
 */
export const publishDraftFn = createServerFn({ method: 'POST' })
  .inputValidator(publishDraftSchema)
  .handler(async ({ data }): Promise<PublishDraftResult> => {
    await requireAuth()

    if (!BUCKET_NAME) {
      throw new Error('Server misconfiguration: ASSETS_BUCKET_NAME must be set')
    }

    if (!ARTICLE_TRIGGER_ARN) {
      throw new Error('Server misconfiguration: ARTICLE_TRIGGER_ARN must be set')
    }

    const slug = deriveSlug(data.fileName)

    if (!slug) {
      return {
        success: false,
        slug: '',
        message: 'Invalid filename — could not derive a valid slug',
      }
    }

    // Step 1: Upload draft to S3
    const s3Key = `drafts/${slug}.md`

    await getS3().send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: data.content,
        ContentType: 'text/markdown; charset=utf-8',
      }),
    )

    // Step 2: Invoke the Article Pipeline Trigger Lambda
    const triggerPayload = JSON.stringify({ slug })

    const result = await getLambda().send(
      new InvokeCommand({
        FunctionName: ARTICLE_TRIGGER_ARN,
        Payload: new TextEncoder().encode(triggerPayload),
        InvocationType: 'Event', // Async — pipeline runs in the background
      }),
    )

    if (result.FunctionError) {
      const errorPayload = result.Payload
        ? JSON.parse(new TextDecoder().decode(result.Payload)) as { errorMessage?: string }
        : { errorMessage: 'Unknown Lambda error' }

      return {
        success: false,
        slug,
        message: 'Pipeline trigger failed',
        error: errorPayload.errorMessage ?? 'Unknown Lambda error',
      }
    }

    return {
      success: true,
      slug,
      message: `Draft "${slug}" uploaded — pipeline triggered!`,
    }
  })
