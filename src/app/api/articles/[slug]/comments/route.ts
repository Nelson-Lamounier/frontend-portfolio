/**
 * Article Comments API
 *
 * GET  /api/articles/[slug]/comments — fetch approved comments (public)
 * POST /api/articles/[slug]/comments — submit new comment (rate limited)
 *
 * Public endpoint — no authentication required.
 * New comments are created with status 'pending' and require admin approval.
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  isEngagementDBConfigured,
  getApprovedComments,
  createComment,
} from '@/lib/dynamodb-engagement'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * Fetch approved comments for an article.
 *
 * @param _request - Unused request object
 * @param context - Route params with article slug
 * @returns Array of approved comments (public-safe: no email/IP)
 */
export async function GET(
  _request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  if (!isEngagementDBConfigured()) {
    return NextResponse.json([])
  }

  const { slug } = await context.params

  try {
    const comments = await getApprovedComments(slug)
    return NextResponse.json(comments, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error(`[articles/${slug}/comments] GET failed:`, err)
    return NextResponse.json([])
  }
}

/**
 * Submit a new comment (pending moderation).
 *
 * @param request - JSON body: { name, email, body }
 * @param context - Route params with article slug
 * @returns Created comment (public-safe)
 */
export async function POST(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  if (!isEngagementDBConfigured()) {
    return NextResponse.json(
      { error: 'Comments not configured' },
      { status: 503 },
    )
  }

  const { slug } = await context.params

  // Extract IP address from headers
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const body = await request.json() as {
      name?: string
      email?: string
      body?: string
    }

    if (!body.name || !body.email || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, body' },
        { status: 400 },
      )
    }

    const comment = await createComment(
      slug,
      body.name,
      body.email,
      body.body,
      ipAddress,
    )

    return NextResponse.json(comment, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    // Rate limit or validation errors
    if (
      message.includes('Rate limit') ||
      message.includes('required') ||
      message.includes('valid email')
    ) {
      return NextResponse.json({ error: message }, { status: 429 })
    }

    console.error(`[articles/${slug}/comments] POST failed:`, err)
    return NextResponse.json(
      { error: 'Failed to submit comment' },
      { status: 500 },
    )
  }
}
