/**
 * Admin Articles API — Draft Listing
 *
 * GET /api/admin/articles — returns all draft articles from DynamoDB.
 * Guarded: only accessible when NODE_ENV === 'development'.
 *
 * This route is used by the local admin drafts page to list
 * articles awaiting review before publication.
 */

import { NextResponse } from 'next/server'

import {
  isDynamoDBConfigured,
  queryDraftArticles,
} from '@/lib/dynamodb-articles'

/**
 * Returns all draft articles for the admin review page.
 *
 * @returns JSON array of draft article metadata
 */
export async function GET(): Promise<NextResponse> {
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

  try {
    const drafts = await queryDraftArticles()
    return NextResponse.json({ articles: drafts, count: drafts.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[admin/articles] Failed to fetch drafts:', message)
    return NextResponse.json(
      { error: 'Failed to fetch draft articles' },
      { status: 500 },
    )
  }
}
