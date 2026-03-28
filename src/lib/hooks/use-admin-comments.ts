/**
 * Admin Comments Hooks
 *
 * TanStack Query hooks for comment listing and moderation mutations.
 * All mutations automatically invalidate the comments cache.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import {
  deleteComment,
  fetchAdminComments,
  moderateComment,
} from '@/lib/api/admin-api'
import type { AdminComment } from '@/lib/api/admin-api'

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Fetches pending comments awaiting moderation.
 *
 * @returns TanStack Query result with comment array
 */
export function useAdminComments() {
  return useQuery<AdminComment[]>({
    queryKey: adminKeys.comments.list(),
    queryFn: fetchAdminComments,
  })
}

// =============================================================================
// MUTATIONS
// =============================================================================

/** Parameters for the moderate comment mutation */
interface ModerateCommentParams {
  readonly compositeId: string
  readonly action: 'approve' | 'reject'
}

/**
 * Mutation hook for approving or rejecting a comment.
 * Invalidates the comments cache on success.
 *
 * @returns TanStack Mutation with `mutate({ compositeId, action })`
 */
export function useModerateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ compositeId, action }: ModerateCommentParams) =>
      moderateComment(compositeId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.comments.all })
    },
  })
}

/**
 * Mutation hook for permanently deleting a comment.
 * Invalidates the comments cache on success.
 *
 * @returns TanStack Mutation with `mutate(compositeId)`
 */
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (compositeId: string) => deleteComment(compositeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.comments.all })
    },
  })
}
