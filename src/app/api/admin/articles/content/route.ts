/**
 * Admin Articles Content API — Read and Write MDX
 *
 * GET  /api/admin/articles/content?slug=<slug> — fetch raw MDX from S3
 * PUT  /api/admin/articles/content              — write updated MDX to S3
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isDynamoDBConfigured,
  getArticleMetadataBySlug,
} from '@/lib/dynamodb-articles'
import { fetchArticleContent, putArticleContent } from '@/lib/s3-content'

// ========================================
// Guards
// ========================================

/**
 * Validates the request has an active admin session and DynamoDB is configured.
 *
 * @returns Error response or null if valid
 */
async function guardRequest(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isDynamoDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  return null
}

// ========================================
// GET — Fetch raw MDX content
// ========================================

/**
 * Fetches the raw MDX content for a given article slug.
 *
 * @param request - Must include `slug` query parameter
 * @returns JSON with `{ content, slug, contentRef }`
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const guardError = await guardRequest()
  if (guardError) return guardError

  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json(
      { error: 'Missing required query parameter: slug' },
      { status: 400 },
    )
  }

  try {
    // 1. Get metadata to find the contentRef
    const metadata = await getArticleMetadataBySlug(slug)
    if (!metadata) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 },
      )
    }

    const contentRef = metadata.contentRef as string | undefined
    if (!contentRef) {
      return NextResponse.json(
        { error: `Article has no S3 content reference: ${slug}` },
        { status: 404 },
      )
    }

    // 2. Fetch raw MDX from S3
    const articleContent = await fetchArticleContent(contentRef)
    if (!articleContent) {
      return NextResponse.json(
        { error: `Content not found in S3 for: ${slug}` },
        { status: 404 },
      )
    }

    return NextResponse.json({
      slug,
      contentRef,
      content: articleContent.content,
      title: metadata.title,
      description: metadata.description,
      status: metadata.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[admin/articles/content] GET failed for "${slug}":`, message)
    return NextResponse.json(
      { error: 'Failed to fetch article content' },
      { status: 500 },
    )
  }
}

// ========================================
// PUT — Write updated MDX content to S3
// ========================================

/** Request body shape for the PUT endpoint */
interface UpdateContentBody {
  readonly slug: string
  readonly content: string
}

/**
 * Writes updated MDX content to S3 for a given article slug.
 *
 * @param request - Must contain JSON body with `slug` and `content`
 * @returns JSON with `{ saved: true, slug }`
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const guardError = await guardRequest()
  if (guardError) return guardError

  // Parse body
  let body: UpdateContentBody
  try {
    body = (await request.json()) as UpdateContentBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: slug' },
      { status: 400 },
    )
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: content' },
      { status: 400 },
    )
  }

  const slug = body.slug.trim()

  try {
    // 1. Get metadata to find the contentRef
    const metadata = await getArticleMetadataBySlug(slug)
    if (!metadata) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 },
      )
    }

    const contentRef = metadata.contentRef as string | undefined
    if (!contentRef) {
      return NextResponse.json(
        { error: `Article has no S3 content reference: ${slug}` },
        { status: 404 },
      )
    }

    // 2. Write updated content to S3
    await putArticleContent(contentRef, body.content)

    console.log(`[admin/articles/content] Saved content for "${slug}" (${body.content.length} bytes)`)

    return NextResponse.json({ saved: true, slug, bytes: body.content.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[admin/articles/content] PUT failed for "${slug}":`, message)
    return NextResponse.json(
      { error: 'Failed to save article content' },
      { status: 500 },
    )
  }
}
