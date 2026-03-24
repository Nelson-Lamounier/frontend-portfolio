/**
 * Article Like API
 *
 * GET  /api/articles/[slug]/like — check like status + count
 * POST /api/articles/[slug]/like — toggle like (session ID in body)
 *
 * Public endpoint — no authentication required.
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  isEngagementDBConfigured,
  getLikeStatus,
  toggleLike,
} from '@/lib/dynamodb-engagement'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * Check like status for a session.
 *
 * @param request - Query param: sessionId
 * @param context - Route params with article slug
 * @returns Like status (liked, likeCount)
 */
export async function GET(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  if (!isEngagementDBConfigured()) {
    return NextResponse.json({ liked: false, likeCount: 0 })
  }

  const { slug } = await context.params
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ liked: false, likeCount: 0 })
  }

  try {
    const status = await getLikeStatus(slug, sessionId)
    return NextResponse.json(status)
  } catch (err) {
    console.error(`[articles/${slug}/like] GET failed:`, err)
    return NextResponse.json({ liked: false, likeCount: 0 })
  }
}

/**
 * Toggle like for an article.
 *
 * @param request - JSON body: { sessionId: string }
 * @param context - Route params with article slug
 * @returns Updated like status
 */
export async function POST(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  if (!isEngagementDBConfigured()) {
    return NextResponse.json(
      { error: 'Engagement features not configured' },
      { status: 503 },
    )
  }

  const { slug } = await context.params

  try {
    const body = await request.json() as { sessionId?: string }

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 },
      )
    }

    const status = await toggleLike(slug, body.sessionId)
    return NextResponse.json(status)
  } catch (err) {
    console.error(`[articles/${slug}/like] POST failed:`, err)
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 },
    )
  }
}
