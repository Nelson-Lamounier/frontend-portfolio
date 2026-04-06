/**
 * @format
 * Comment moderation server functions for the admin dashboard.
 *
 * Provides read/moderate/delete operations for user comments,
 * all protected by JWT authentication via `requireAuth()`.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  isEngagementDBConfigured,
  getPendingComments,
  moderateComment,
  deleteComment,
} from '@/lib/articles/dynamodb-engagement'
import { requireAuth } from './auth-guard'

// =============================================================================
// Input Schemas
// =============================================================================

const moderateCommentSchema = z.object({
  id: z.string().min(1, 'Comment composite ID is required'),
  status: z.enum(['approve', 'reject']),
})

const deleteCommentSchema = z.string().min(1, 'Comment composite ID is required')

// =============================================================================
// Helpers
// =============================================================================

/**
 * Splits a composite comment ID (`slug__sk`) into its constituent parts.
 *
 * @param compositeId - Combined `slug__sk` identifier
 * @returns Tuple of `[slug, sk]`
 */
function parseCompositeId(compositeId: string): [string, string] {
  const [slug, ...skParts] = compositeId.split('__')
  return [slug, skParts.join('__')]
}

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Retrieves all comments pending moderation.
 *
 * @returns Array of pending comment records
 */
export const getPendingCommentsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()

    if (!isEngagementDBConfigured()) {
      throw new Error('Engagement DB is not configured')
    }

    return await getPendingComments()
  },
)

/**
 * Approves or rejects a pending comment.
 *
 * @param data.id - Composite comment ID in `slug__sk` format
 * @param data.status - `'approve'` or `'reject'`
 * @returns Success indicator
 */
export const moderateCommentFn = createServerFn({ method: 'POST' })
  .inputValidator(moderateCommentSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const [slug, sk] = parseCompositeId(data.id)
    await moderateComment(slug, sk, data.status)

    return { success: true }
  })

/**
 * Permanently deletes a comment.
 *
 * @param data - Composite comment ID in `slug__sk` format
 * @returns Success indicator
 */
export const deleteCommentFn = createServerFn({ method: 'POST' })
  .inputValidator(deleteCommentSchema)
  .handler(async ({ data: compositeId }) => {
    await requireAuth()

    const [slug, sk] = parseCompositeId(compositeId)
    await deleteComment(slug, sk)

    return { success: true }
  })
