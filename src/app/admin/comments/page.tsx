/**
 * Admin Comments Moderation Page
 *
 * Queue of pending comments awaiting approval or rejection.
 * Shows commenter name, email, article, body, and timestamp.
 *
 * Route: /admin/comments
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ========================================
// Types
// ========================================

interface AdminComment {
  commentId: string
  articleSlug: string
  name: string
  email: string
  body: string
  status: string
  createdAt: string
}

type PageState = 'loading' | 'ready' | 'error'

// ========================================
// Page Component
// ========================================

/**
 * Admin page for moderating pending comments.
 *
 * @returns Comment moderation page JSX
 */
export default function AdminCommentsPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>('loading')
  const [comments, setComments] = useState<AdminComment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetches pending comments from the admin API.
   */
  const fetchComments = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const res = await fetch('/api/admin/comments')

      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      const data = await res.json() as AdminComment[]
      setComments(data)
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
      setState('error')
    }
  }, [router])

  /**
   * Builds the composite ID for the moderation API.
   * Format: slug__COMMENT#timestamp#uuid
   */
  const buildCompositeId = (comment: AdminComment): string => {
    return `${comment.articleSlug}__COMMENT#${comment.createdAt}#${comment.commentId}`
  }

  /**
   * Approve or reject a comment.
   */
  const handleModerate = useCallback(async (
    comment: AdminComment,
    action: 'approve' | 'reject',
  ) => {
    if (processing) return
    setProcessing(comment.commentId)

    try {
      const compositeId = buildCompositeId(comment)
      const res = await fetch(`/api/admin/comments/${encodeURIComponent(compositeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} comment`)
    } finally {
      setProcessing(null)
    }
  }, [processing, fetchComments])

  /**
   * Permanently delete a comment.
   */
  const handleDelete = useCallback(async (comment: AdminComment) => {
    if (processing) return

    const confirmed = window.confirm(
      `Delete this comment from "${comment.name}"?\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    setProcessing(comment.commentId)

    try {
      const compositeId = buildCompositeId(comment)
      const res = await fetch(`/api/admin/comments/${encodeURIComponent(compositeId)}`, {
        method: 'DELETE',
      })

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    } finally {
      setProcessing(null)
    }
  }, [processing, fetchComments])

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
          <button type="button" onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
        </div>
      )}

      {/* Empty State */}
      {state === 'ready' && comments.length === 0 && (
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
      {state === 'ready' && comments.length > 0 && (
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
                  disabled={!!processing}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-500 disabled:opacity-50"
                >
                  {processing === comment.commentId ? 'Processing…' : '✓ Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => handleModerate(comment, 'reject')}
                  disabled={!!processing}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  ✗ Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(comment)}
                  disabled={!!processing}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={() => router.push('/admin/resumes')}
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Resumes
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/drafts')}
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Articles
        </button>
      </div>
    </div>
  )
}
