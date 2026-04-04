import { useAdminComments, useDeleteComment, useModerateComment } from '@/hooks/use-admin-comments'
import { useToastStore } from '@/lib/stores/toast-store'
import type { AdminComment } from '@/lib/api/admin-api'

// ========================================
// HELPERS
// ========================================

/**
 * Builds the composite ID for the moderation API.
 * Format: slug__COMMENT#timestamp#uuid
 *
 * @param comment - Comment to build the composite ID for
 * @returns Composite ID string
 */
function buildCompositeId(comment: AdminComment): string {
  return `${comment.articleSlug}__COMMENT#${comment.createdAt}#${comment.commentId}`
}

// ========================================
// PAGE COMPONENT
// ========================================

/**
 * Admin page for moderating pending comments.
 * Data is fetched via TanStack Query — mutations automatically
 * invalidate the cache and update badge counts.
 *
 * @returns Comment moderation page JSX
 */
export function CommentModeration() {
  // TanStack Query state
  const { data: comments, isLoading, error: queryError, refetch } = useAdminComments()
  const moderateMutation = useModerateComment()
  const deleteMutation = useDeleteComment()
  const { addToast } = useToastStore()

  // Derived state
  const error = queryError?.message ?? null
  const isProcessing = moderateMutation.isPending || deleteMutation.isPending

  /**
   * Approve or reject a comment.
   *
   * @param comment - Comment to moderate
   * @param action - Moderation action
   */
  function handleModerate(comment: AdminComment, action: 'approve' | 'reject'): void {
    const compositeId = buildCompositeId(comment)
    moderateMutation.mutate(
      { compositeId, action },
      {
        onSuccess: () => addToast('success', `Comment ${action}d successfully.`),
        onError: (err) => addToast('error', err.message),
      },
    )
  }

  /**
   * Permanently delete a comment after confirmation.
   *
   * @param comment - Comment to delete
   */
  function handleDelete(comment: AdminComment): void {
    const confirmed = globalThis.window.confirm(
      `Delete this comment from "${comment.name}"?\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    const compositeId = buildCompositeId(comment)
    deleteMutation.mutate(compositeId, {
      onSuccess: () => addToast('success', 'Comment deleted.'),
      onError: (err) => addToast('error', err.message),
    })
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Comment Moderation
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Review and approve or reject pending comments.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && comments?.length === 0 && (
        <div className="mt-12 rounded-xl border-2 border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            All caught up!
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No pending comments to moderate.
          </p>
        </div>
      )}

      {/* Comment Cards */}
      {!isLoading && !error && comments && comments.length > 0 && (
        <div className="mt-6 space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.commentId}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              {/* Meta */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {comment.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {comment.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-700">
                    {comment.articleSlug}
                  </span>
                  <time dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </div>

              {/* Body */}
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {comment.body}
              </p>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleModerate(comment, 'approve')}
                  disabled={isProcessing}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-500 disabled:opacity-50"
                >
                  {moderateMutation.isPending ? 'Processing…' : '✓ Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => handleModerate(comment, 'reject')}
                  disabled={isProcessing}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  ✗ Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(comment)}
                  disabled={isProcessing}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
