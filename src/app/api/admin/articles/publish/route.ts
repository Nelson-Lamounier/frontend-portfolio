/**
 * Admin Articles API — Publish Action
 *
 * POST /api/admin/articles/publish — transitions an article from
 * 'draft' to 'published' status in DynamoDB.
 *
 * Request body: { slug: string }
 *
 * Guarded: only accessible when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  isDynamoDBConfigured,
  publishArticle,
} from '@/lib/dynamodb-articles'

/** Request body schema */
interface PublishRequestBody {
  readonly slug: string
}

/**
 * Publishes a draft article by slug.
 *
 * @param request - Must contain JSON body with `slug` field
 * @returns Updated article metadata on success
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: dev-only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin routes are only available in development' },
      { status: 403 },
    )
  }

  if (!isDynamoDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  // Parse and validate request body
  let body: PublishRequestBody
  try {
    body = (await request.json()) as PublishRequestBody
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

  const slug = body.slug.trim()
  if (slug.length === 0 || slug.length > 200) {
    return NextResponse.json(
      { error: 'Invalid slug format' },
      { status: 400 },
    )
  }

  try {
    const article = await publishArticle(slug)
    console.log(`[admin/articles] Published article: ${slug}`)
    return NextResponse.json({ article, published: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[admin/articles] Failed to publish "${slug}":`, message)

    // Handle ConditionalCheckFailedException (article not found)
    if (message.includes('ConditionalCheckFailed') || message.includes('not found')) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to publish article' },
      { status: 500 },
    )
  }
}
