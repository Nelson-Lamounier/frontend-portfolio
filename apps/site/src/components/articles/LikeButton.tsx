/**
 * LikeButton — Session-Based Article Like Toggle
 *
 * Anonymous like button with optimistic UI. Stores a session UUID
 * in localStorage so likes persist across page reloads within
 * the same browser.
 *
 * Shows a heart icon with the total like count.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface LikeButtonProps {
  /** Article URL slug */
  slug: string
}

/** localStorage key for the session ID */
const SESSION_KEY = 'portfolio-session-id'

/**
 * Gets or creates a persistent session UUID.
 *
 * @returns Session UUID string
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

/**
 * Heart icon component with filled/outline variants.
 */
function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

/**
 * Article like button with optimistic toggle and session persistence.
 *
 * @param props - Article slug for the like target
 * @returns Like button JSX
 */
export function LikeButton({ slug }: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const initialised = useRef(false)

  // Fetch initial like status
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    const sessionId = getSessionId()
    if (!sessionId) return

    fetch(`/api/articles/${slug}/like?sessionId=${sessionId}`)
      .then((res) => res.json())
      .then((data: { liked: boolean; likeCount: number }) => {
        setLiked(data.liked)
        setCount(data.likeCount)
      })
      .catch(() => {
        // Silent fail — default to unlicked/0
      })
  }, [slug])

  /**
   * Toggle like with optimistic UI update.
   */
  const handleToggle = useCallback(async () => {
    if (loading) return
    setLoading(true)

    const sessionId = getSessionId()
    if (!sessionId) return

    // Optimistic update
    const wasLiked = liked
    const prevCount = count
    setLiked(!wasLiked)
    setCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1)

    try {
      const res = await fetch(`/api/articles/${slug}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (res.ok) {
        const data = await res.json() as { liked: boolean; likeCount: number }
        setLiked(data.liked)
        setCount(data.likeCount)
      } else {
        // Revert optimistic update
        setLiked(wasLiked)
        setCount(prevCount)
      }
    } catch {
      // Revert optimistic update
      setLiked(wasLiked)
      setCount(prevCount)
    } finally {
      setLoading(false)
    }
  }, [loading, liked, count, slug])

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        liked
          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50'
          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700'
      }`}
      aria-label={liked ? 'Unlike this article' : 'Like this article'}
    >
      <HeartIcon
        filled={liked}
        className={`h-5 w-5 transition ${
          liked
            ? 'text-red-500 dark:text-red-400'
            : 'text-zinc-400 group-hover:text-red-400 dark:text-zinc-500'
        }`}
      />
      <span>{count}</span>
    </button>
  )
}
