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

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

import type { ArticleContent} from './types/article.types'

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
 * Follows the convention: published/<slug>.mdx
 */
export function buildContentRef(slug: string, bucket?: string): string {
  const key = `published/${slug}.mdx`
  if (bucket) {
    return `s3://${bucket}/${key}`
  }
  return key
}
