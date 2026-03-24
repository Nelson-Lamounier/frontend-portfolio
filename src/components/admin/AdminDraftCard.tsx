/**
 * Admin Draft Card Component
 *
 * Displays a single draft article with preview and publish actions.
 * Used on the admin drafts page for reviewing Bedrock-generated articles.
 */

'use client'

import { useCallback, useState } from 'react'
import type { ArticleWithSlug } from '@/lib/types/article.types'

// =============================================================================
// PROPS
// =============================================================================

interface AdminDraftCardProps {
  /** Draft article metadata */
  readonly article: ArticleWithSlug
  /** Callback invoked when article is successfully published */
  readonly onPublished: (slug: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Card component for a draft article with preview and publish actions.
 *
 * @param props - Article data and publish callback
 * @returns Admin draft card JSX
 */
export function AdminDraftCard({ article, onPublished }: AdminDraftCardProps) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handles the publish action with confirmation.
   */
  const handlePublish = useCallback(async () => {
    const confirmed = window.confirm(
      `Are you sure you want to publish "${article.title}"?\n\nThis will make the article visible to all visitors.`,
    )
    if (!confirmed) return

    setIsPublishing(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/articles/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: article.slug }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      onPublished(article.slug)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish'
      setError(message)
    } finally {
      setIsPublishing(false)
    }
  }, [article.slug, article.title, onPublished])

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-6 transition-shadow hover:shadow-lg">
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
          Draft
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

      {/* Description / AI Summary */}
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
        {article.description || article.aiSummary || 'No description available.'}
      </p>

      {/* Metadata Row */}
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

      {/* Error Banner */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
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
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {isPublishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
