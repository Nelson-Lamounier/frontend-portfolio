/**
 * Admin Drafts Page
 *
 * Local-only page for reviewing Bedrock-generated articles before publishing.
 * Fetches draft articles from the admin API and provides preview + publish actions.
 *
 * Route: /admin/drafts
 * Access: NODE_ENV === 'development' only
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { AdminDraftCard } from '@/components/admin/AdminDraftCard'

// =============================================================================
// TYPES
// =============================================================================

interface DraftsApiResponse {
  articles: ArticleWithSlug[]
  count: number
}

type PageState = 'loading' | 'ready' | 'error' | 'blocked'

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin page listing all draft articles awaiting review.
 *
 * @returns Admin drafts page JSX
 */
export default function AdminDraftsPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>('loading')
  const [drafts, setDrafts] = useState<ArticleWithSlug[]>([])
  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Guard: dev-only (client-side check as additional safety)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/')
      setState('blocked')
      return
    }

    fetchDrafts()
  }, [router])

  /**
   * Fetches draft articles from the admin API.
   */
  const fetchDrafts = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/admin/articles')

      if (response.status === 403) {
        setState('blocked')
        router.replace('/')
        return
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      const data = (await response.json()) as DraftsApiResponse
      setDrafts(data.articles)
      setState('ready')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drafts'
      setError(message)
      setState('error')
    }
  }, [router])

  /**
   * Handles a successful publish — marks the slug as published in local state.
   */
  const handlePublished = useCallback((slug: string) => {
    setPublishedSlugs((prev) => new Set(prev).add(slug))
  }, [])

  if (state === 'blocked') return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            Development Only
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Article Drafts
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Review Bedrock-generated articles before publishing them to the portfolio.
        </p>
      </div>

      {/* Loading State */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading drafts from DynamoDB…</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchDrafts}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ready State */}
      {state === 'ready' && (
        <>
          {drafts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                No draft articles found. Push a new Markdown file to the{' '}
                <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs">
                  drafts/
                </code>{' '}
                folder to trigger Bedrock transformation.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats bar */}
              <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>
                  {drafts.length - publishedSlugs.size} draft{drafts.length - publishedSlugs.size !== 1 ? 's' : ''} awaiting review
                </span>
                {publishedSlugs.size > 0 && (
                  <span className="text-teal-600 dark:text-teal-400">
                    ✓ {publishedSlugs.size} published this session
                  </span>
                )}
              </div>

              {/* Draft cards */}
              {drafts.map((article) => (
                publishedSlugs.has(article.slug) ? (
                  <div
                    key={article.slug}
                    className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-6"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900/30 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
                        Published ✓
                      </span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {article.title}
                      </span>
                    </div>
                    <a
                      href={`/articles/${article.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      View published article ↗
                    </a>
                  </div>
                ) : (
                  <AdminDraftCard
                    key={article.slug}
                    article={article}
                    onPublished={handlePublished}
                  />
                )
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
