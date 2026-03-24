/**
 * Admin Comment Moderation API — Approve/Reject/Delete
 *
 * PUT    /api/admin/comments/[id] — approve or reject
 * DELETE /api/admin/comments/[id] — permanently delete
 *
 * The [id] param is a composite: `<slug>__<commentSk>` (double underscore separator)
 * because the comment needs both pk (from slug) and sk to be identified in DynamoDB.
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isEngagementDBConfigured,
  moderateComment,
  deleteComment,
} from '@/lib/dynamodb-engagement'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Parses the composite ID into slug and comment sort key.
 *
 * @param compositeId - Format: `<slug>__<commentSk>`
 * @returns Parsed slug and sort key
 */
function parseCompositeId(compositeId: string): { slug: string; commentSk: string } | null {
  const parts = compositeId.split('__')
  if (parts.length < 2) return null
  return {
    slug: parts[0],
    commentSk: parts.slice(1).join('__'), // Handle sort keys containing __
  }
}

/**
 * Approve or reject a comment.
 *
 * @param request - JSON body: { action: 'approve' | 'reject' }
 * @param context - Route params with composite comment ID
 * @returns Moderated comment
 */
export async function PUT(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isEngagementDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  const { id } = await context.params
  const parsed = parseCompositeId(id)
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid comment ID format' },
      { status: 400 },
    )
  }

  try {
    const body = await request.json() as { action?: string }
    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject".' },
        { status: 400 },
      )
    }

    const comment = await moderateComment(parsed.slug, parsed.commentSk, body.action)
    return NextResponse.json(comment)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`[admin/comments/${id}] Moderation failed:`, err)
    return NextResponse.json(
      { error: 'Failed to moderate comment' },
      { status: 500 },
    )
  }
}

/**
 * Permanently delete a comment.
 *
 * @param _request - Unused request object
 * @param context - Route params with composite comment ID
 * @returns 204 No Content on success
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isEngagementDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  const { id } = await context.params
  const parsed = parseCompositeId(id)
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid comment ID format' },
      { status: 400 },
    )
  }

  try {
    await deleteComment(parsed.slug, parsed.commentSk)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`[admin/comments/${id}] Delete failed:`, err)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 },
    )
  }
}
