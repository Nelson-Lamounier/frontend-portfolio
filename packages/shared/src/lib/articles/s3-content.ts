/**
 * S3 Article Content Retrieval (Server-Side Only)
 *
 * Fetches article content (MDX body) from S3 via VPC Gateway Endpoint.
 * Replaces the previous DynamoDB CONTENT entity storage pattern.
 *
 * This module should NEVER be imported from client components.
 *
 * Environment Variables:
 *   ASSETS_BUCKET_NAME – required (discovered via SSM from NextJsDataStack)
 *   AWS_REGION         – supplied by ECS task metadata
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

import type { ArticleContent } from '../types/article.types'
import type { ImageSidecar } from '../types/content-blocks'
import { safeValidateSidecar } from '../types/content-schemas'

// Re-export for convenience
export type { ImageSidecar } from '../types/content-blocks'

// ========================================
// Configuration
// ========================================

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const REGION = process.env.AWS_REGION || 'eu-west-1'

/**
 * Check if S3 content access is configured
 */
export function isS3Configured(): boolean {
  return !!ASSETS_BUCKET_NAME
}

/**
 * Check if an article is S3-hosted (has a contentRef pointer)
 */
export function isS3Article(contentRef?: string): boolean {
  return !!contentRef && contentRef.length > 0
}

// ========================================
// S3 Client (singleton, lazy init)
// ========================================

let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({ region: REGION })
  }
  return _s3Client
}

// ========================================
// Content Fetch Functions
// ========================================

/**
 * Parse a contentRef URI into bucket and key.
 *
 * Supports two formats:
 *   - Full S3 URI: "s3://my-bucket/published/my-article.mdx"
 *   - Key-only:    "published/my-article.mdx" (uses ASSETS_BUCKET_NAME)
 */
function parseContentRef(contentRef: string): { bucket: string; key: string } {
  if (contentRef.startsWith('s3://')) {
    const withoutProtocol = contentRef.slice(5) // remove "s3://"
    const slashIndex = withoutProtocol.indexOf('/')
    if (slashIndex === -1) {
      throw new Error(`Invalid contentRef: missing key in "${contentRef}"`)
    }
    return {
      bucket: withoutProtocol.slice(0, slashIndex),
      key: withoutProtocol.slice(slashIndex + 1),
    }
  }

  // Key-only format — use configured bucket
  if (!ASSETS_BUCKET_NAME) {
    throw new Error(
      'ASSETS_BUCKET_NAME not configured and contentRef is not a full S3 URI',
    )
  }
  return { bucket: ASSETS_BUCKET_NAME, key: contentRef }
}

/**
 * Fetch article content from S3 using the contentRef pointer.
 *
 * The contentRef is stored on the DynamoDB metadata entity and
 * points to the MDX file in S3.
 *
 * @param contentRef - S3 URI or key from the metadata entity
 * @returns Parsed article content, or null if not found
 */
export async function fetchArticleContent(
  contentRef: string,
): Promise<ArticleContent | null> {
  const s3Client = getS3Client()
  const { bucket, key } = parseContentRef(contentRef)

  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )

    const body = await result.Body?.transformToString()
    if (!body) return null

    return {
      contentType: 'mdx',
      content: body,
      componentData: [],
      images: [],
      version: 1,
    }
  } catch (err: unknown) {
    const error = err as { name?: string }
    if (error.name === 'NoSuchKey') {
      return null
    }
    throw err
  }
}

/**
 * Build a contentRef key for a given slug.
 *
 * Supports two patterns:
 *   - Legacy: "published/<slug>.mdx"
 *   - New:    "articles/<slug>/content.mdx"
 */
export function buildContentRef(
  slug: string,
  options?: { bucket?: string; format?: 'legacy' | 'new' },
): string {
  const format = options?.format ?? 'new'
  const key =
    format === 'new'
      ? `articles/${slug}/content.mdx`
      : `published/${slug}.mdx`

  if (options?.bucket) {
    return `s3://${options.bucket}/${key}`
  }
  return key
}

// ========================================
// Image Sidecar Fetch
// ========================================

/**
 * Fetch and validate an image sidecar from S3.
 *
 * Derives the sidecar key from the image key:
 *   "articles/<slug>/images/hero.webp" → "articles/<slug>/images/hero.json"
 *
 * @returns Validated ImageSidecar or null if not found / invalid
 */
export async function fetchImageSidecar(
  imageKey: string,
): Promise<ImageSidecar | null> {
  const sidecarKey = imageKey.replace(
    /\.(webp|png|jpg|jpeg|gif|avif)$/i,
    '.json',
  )

  const s3Client = getS3Client()

  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: sidecarKey,
      }),
    )

    const body = await result.Body?.transformToString()
    if (!body) return null

    const parsed: unknown = JSON.parse(body)
    const validation = safeValidateSidecar(parsed)

    if (!validation.success) {
       
      console.warn(
        `[s3-content] Invalid sidecar at ${sidecarKey}:`,
        validation.error.issues,
      )
      return null
    }

    return validation.data
  } catch (err: unknown) {
    const error = err as { name?: string }
    if (error.name === 'NoSuchKey') {
      return null
    }
     
    console.warn(`[s3-content] Failed to fetch sidecar: ${sidecarKey}`)
    return null
  }
}

// ========================================
// Content Write Functions
// ========================================

/**
 * Write updated article content back to S3.
 *
 * @param contentRef - S3 URI or key pointing to the MDX file
 * @param content - Updated MDX string content
 * @throws If the write fails
 */
export async function putArticleContent(
  contentRef: string,
  content: string,
): Promise<void> {
  const s3Client = getS3Client()
  const { bucket, key } = parseContentRef(contentRef)

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: 'text/mdx; charset=utf-8',
    }),
  )
}
