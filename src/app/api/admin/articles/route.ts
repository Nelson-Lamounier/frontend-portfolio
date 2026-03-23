/**
 * Admin Articles API — Draft and Published Listing
 *
 * GET /api/admin/articles              — returns all draft articles
 * GET /api/admin/articles?status=all   — returns both drafts and published
 * GET /api/admin/articles?status=published — returns only published
 *
 * Guarded: only accessible when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  isDynamoDBConfigured,
  queryDraftArticles,
  queryPublishedArticles,
} from '@/lib/dynamodb-articles'

/**
 * Returns articles for the admin page filtered by status.
 *
 * @param request - Optional `status` query param: 'draft' (default), 'published', or 'all'
 * @returns JSON array of article metadata
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Guard: dev-only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin routes are only available in development' },
      { status: 403 },
    )
  }

  if (!isDynamoDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured — set DYNAMODB_TABLE_NAME in .env.local' },
      { status: 503 },
    )
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'draft'

  try {
    if (status === 'all') {
      const [drafts, published] = await Promise.all([
        queryDraftArticles(),
        queryPublishedArticles(),
      ])
      return NextResponse.json({
        drafts,
        published,
        draftCount: drafts.length,
        publishedCount: published.length,
      })
    }

    if (status === 'published') {
      const published = await queryPublishedArticles()
      return NextResponse.json({ articles: published, count: published.length })
    }

    // Default: drafts only (backwards-compatible)
    const drafts = await queryDraftArticles()
    return NextResponse.json({ articles: drafts, count: drafts.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[admin/articles] Failed to fetch articles:', message)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 },
    )
  }
}
