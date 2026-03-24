/**
 * Admin Articles Page
 *
 * Local-only page for managing Bedrock-generated articles.
 * Shows tab-based view of drafts and published articles with
 * preview, edit, publish, and delete actions.
 *
 * Route: /admin/drafts
 * Access: NODE_ENV === 'development' only
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArticleWithSlug } from '@/lib/types/article.types'

// =============================================================================
// TYPES
// =============================================================================

interface AllArticlesApiResponse {
  drafts: ArticleWithSlug[]
  published: ArticleWithSlug[]
  draftCount: number
  publishedCount: number
}

type PageState = 'loading' | 'ready' | 'error' | 'blocked'
type ActiveTab = 'drafts' | 'published'

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin page listing all articles with tabs for drafts and published.
 *
 * @returns Admin articles page JSX
 */
export default function AdminDraftsPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>('loading')
  const [drafts, setDrafts] = useState<ArticleWithSlug[]>([])
  const [published, setPublished] = useState<ArticleWithSlug[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('drafts')
  const [error, setError] = useState<string | null>(null)

  // Fetch articles on mount (auth is handled by middleware)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchArticles()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetches all articles (drafts + published) from the admin API.
   */
  const fetchArticles = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/admin/articles?status=all')

      if (response.status === 403) {
        setState('blocked')
        router.replace('/')
        return
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      const data = (await response.json()) as AllArticlesApiResponse
      setDrafts(data.drafts)
      setPublished(data.published)
      setState('ready')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load articles'
      setError(message)
      setState('error')
    }
  }, [router])

  /**
   * Handles publishing an article — moves it from drafts to published.
   */
  const handlePublish = useCallback(async (slug: string, title: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to publish "${title}"?\n\nThis will make the article visible to all visitors.`,
    )
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/articles/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      // Refresh the list after publish
      await fetchArticles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish'
      window.alert(`Error: ${message}`)
    }
  }, [fetchArticles])

  /**
   * Handles unpublishing an article — moves it back to draft.
   */
  const handleUnpublish = useCallback(async (slug: string, title: string) => {
    const confirmed = window.confirm(
      `Move "${title}" back to draft?\n\nThis will remove it from the public article listing.`,
    )
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/articles/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      await fetchArticles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unpublish'
      window.alert(`Error: ${message}`)
    }
  }, [fetchArticles])

  /**
   * Handles deleting an article from DynamoDB.
   */
  const handleDelete = useCallback(async (slug: string, title: string) => {
    const confirmed = window.confirm(
      `⚠️ Delete "${title}"?\n\nThis will permanently remove the article metadata from DynamoDB. The S3 content will be preserved as an archive.\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/articles/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      await fetchArticles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      window.alert(`Error: ${message}`)
    }
  }, [fetchArticles])

  if (state === 'blocked') return null

  const currentList = activeTab === 'drafts' ? drafts : published

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
          Article Management
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Review, edit, publish, and delete Bedrock-generated articles.
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
            <span>Loading articles from DynamoDB…</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchArticles}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ready State */}
      {state === 'ready' && (
        <>
          {/* Tabs */}
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
            <button
              onClick={() => setActiveTab('drafts')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'drafts'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Drafts
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {drafts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'published'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Published
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-100 px-1.5 text-xs font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                {published.length}
              </span>
            </button>
          </div>

          {/* Article List */}
          {currentList.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                {activeTab === 'drafts'
                  ? 'No draft articles found. Push a new Markdown file to the drafts/ folder to trigger Bedrock transformation.'
                  : 'No published articles yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentList.map((article) => (
                <ArticleCard
                  key={article.slug}
                  article={article}
                  isDraft={activeTab === 'drafts'}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// ARTICLE CARD COMPONENT
// =============================================================================

interface ArticleCardProps {
  article: ArticleWithSlug
  isDraft: boolean
  onPublish: (slug: string, title: string) => Promise<void>
  onUnpublish: (slug: string, title: string) => Promise<void>
  onDelete: (slug: string, title: string) => Promise<void>
}

/**
 * Card for a single article with context-aware actions.
 */
function ArticleCard({ article, isDraft, onPublish, onUnpublish, onDelete }: ArticleCardProps) {
  const [isActing, setIsActing] = useState(false)

  const handlePublish = async () => {
    setIsActing(true)
    await onPublish(article.slug, article.title)
    setIsActing(false)
  }

  const handleDelete = async () => {
    setIsActing(true)
    await onDelete(article.slug, article.title)
    setIsActing(false)
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-6 transition-shadow hover:shadow-lg">
      {/* Status + Meta Row */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isDraft
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
              : 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300'
          }`}
        >
          {isDraft ? 'Draft' : 'Published'}
        </span>
        {article.readingTimeMinutes && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {article.readingTimeMinutes} min read
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
        {article.title}
      </h3>

      {/* Description */}
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
        {article.description || article.aiSummary || 'No description available.'}
      </p>

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <time dateTime={article.date}>
          {new Date(article.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
        {article.category && (
          <>
            <span>·</span>
            <span>{article.category}</span>
          </>
        )}
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <a
          href={`/articles/${article.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          Preview ↗
        </a>
        <a
          href={`/admin/editor/${article.slug}`}
          className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40"
        >
          Edit ✎
        </a>
        {isDraft ? (
          <button
            onClick={handlePublish}
            disabled={isActing}
            className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {isActing ? 'Publishing…' : 'Publish'}
          </button>
        ) : (
          <button
            onClick={async () => { setIsActing(true); await onUnpublish(article.slug, article.title); setIsActing(false) }}
            disabled={isActing}
            className="rounded-lg border border-amber-300 dark:border-amber-700 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isActing ? 'Unpublishing…' : 'Unpublish'}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isActing}
          className="ml-auto rounded-lg border border-red-300 dark:border-red-700 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
