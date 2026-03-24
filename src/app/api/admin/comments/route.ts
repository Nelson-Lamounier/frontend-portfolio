/**
 * Admin Comments Moderation API — Pending Queue
 *
 * GET /api/admin/comments — list pending comments for moderation
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isEngagementDBConfigured,
  getPendingComments,
} from '@/lib/dynamodb-engagement'

/**
 * List pending comments awaiting moderation.
 *
 * @returns Array of pending comments with admin details
 */
export async function GET(): Promise<NextResponse> {
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

  try {
    const comments = await getPendingComments()
    return NextResponse.json(comments)
  } catch (err) {
    console.error('[admin/comments] Failed to list pending comments:', err)
    return NextResponse.json(
      { error: 'Failed to fetch pending comments' },
      { status: 500 },
    )
  }
}
