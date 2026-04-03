/**
 * CommentSection — Article Comments with Moderated Submission
 *
 * Displays approved comments and a submission form.
 * New comments are submitted as `pending` and require admin approval.
 * Shows a "your comment is awaiting moderation" message after submit.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ========================================
// Types
// ========================================

interface CommentSectionProps {
  /** Article URL slug */
  slug: string
}

interface PublicComment {
  commentId: string
  name: string
  body: string
  createdAt: string
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

// ========================================
// Component
// ========================================

/**
 * Article comment section with form and approved comments list.
 *
 * @param props - Article slug
 * @returns Comment section JSX
 */
export function CommentSection({ slug }: CommentSectionProps) {
  const [comments, setComments] = useState<PublicComment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [body, setBody] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchedRef = useRef(false)

  // Fetch approved comments on mount
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    fetch(`/api/articles/${slug}/comments`)
      .then((res) => res.json())
      .then((data: PublicComment[]) => {
        setComments(data)
        setLoadingComments(false)
      })
      .catch(() => {
        setLoadingComments(false)
      })
  }, [slug])

  /**
   * Submit a new comment.
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitState === 'submitting') return

    setSubmitState('submitting')
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/articles/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          body: body.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Submission failed' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setSubmitState('success')
      setName('')
      setEmail('')
      setBody('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit comment')
      setSubmitState('error')
    }
  }, [submitState, slug, name, email, body])

  const inputClasses = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-700">
      <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Comments
      </h2>

      {/* ──────── Approved Comments ──────── */}
      {loadingComments ? (
        <div className="mt-4 flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.commentId}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {comment.name}
                </span>
                <time
                  dateTime={comment.createdAt}
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                >
                  {new Date(comment.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ──────── Comment Form ──────── */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Leave a comment
        </h3>

        {submitState === 'success' ? (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
            ✓ Your comment has been submitted and is awaiting moderation. It will appear once approved.
            <button
              type="button"
              onClick={() => setSubmitState('idle')}
              className="ml-2 font-medium underline"
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="comment-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Name *
                </label>
                <input
                  id="comment-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Your name"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="comment-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email * <span className="text-zinc-400">(not displayed)</span>
                </label>
                <input
                  id="comment-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className={inputClasses}
                />
              </div>
            </div>
            <div>
              <label htmlFor="comment-body" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Comment *
              </label>
              <textarea
                id="comment-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={2000}
                rows={4}
                placeholder="Share your thoughts..."
                className={`${inputClasses} min-h-[100px] resize-y`}
              />
              <div className="mt-1 text-right text-xs text-zinc-400">
                {body.length} / 2000
              </div>
            </div>

            {/* Error */}
            {submitState === 'error' && errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitState === 'submitting' || !name.trim() || !email.trim() || !body.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            >
              {submitState === 'submitting' ? 'Submitting…' : 'Post Comment'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
