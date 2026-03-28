/**
 * Admin Articles Page
 *
 * Page for managing Bedrock-generated articles.
 * Shows tab-based view of drafts and published articles with
 * preview, edit, publish, and delete actions.
 * Uses TanStack Query hooks for data fetching and mutations.
 *
 * Route: /admin/drafts
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useState } from 'react'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import {
  useAdminArticles,
  useDeleteArticle,
  usePublishArticle,
  useUnpublishArticle,
  useUpdateMetadata,
} from '@/lib/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'

// =============================================================================
// TYPES
// =============================================================================

type ActiveTab = 'drafts' | 'published'

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin page listing all articles with tabs for drafts and published.
 * Data is fetched via TanStack Query — mutations automatically
 * invalidate the cache and update badge counts.
 *
 * @returns Admin articles page JSX
 */
export default function AdminDraftsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('drafts')

  // TanStack Query hooks
  const { data: articles, isLoading, error: queryError, refetch } = useAdminArticles()
  const publishMutation = usePublishArticle()
  const unpublishMutation = useUnpublishArticle()
  const deleteMutation = useDeleteArticle()
  const { addToast } = useToastStore()

  // Derived state
  const error = queryError?.message ?? null
  const drafts = articles?.drafts ?? []
  const published = articles?.published ?? []
  const currentList = activeTab === 'drafts' ? drafts : published

  /**
   * Handles publishing an article — moves it from drafts to published.
   *
   * @param slug - Article slug
   * @param title - Article title for confirmation dialog
   */
  function handlePublish(slug: string, title: string): void {
    const confirmed = globalThis.window.confirm(
      `Are you sure you want to publish "${title}"?\n\nThis will make the article visible to all visitors.`,
    )
    if (!confirmed) return

    publishMutation.mutate(slug, {
      onSuccess: () => addToast('success', `"${title}" published successfully.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Handles unpublishing an article — moves it back to draft.
   *
   * @param slug - Article slug
   * @param title - Article title for confirmation dialog
   */
  function handleUnpublish(slug: string, title: string): void {
    const confirmed = globalThis.window.confirm(
      `Move "${title}" back to draft?\n\nThis will remove it from the public article listing.`,
    )
    if (!confirmed) return

    unpublishMutation.mutate(slug, {
      onSuccess: () => addToast('success', `"${title}" moved to drafts.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Handles deleting an article from DynamoDB.
   *
   * @param slug - Article slug
   * @param title - Article title for confirmation dialog
   */
  function handleDelete(slug: string, title: string): void {
    const confirmed = globalThis.window.confirm(
      `⚠️ Delete "${title}"?\n\nThis will permanently remove the article metadata from DynamoDB. The S3 content will be preserved as an archive.\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    deleteMutation.mutate(slug, {
      onSuccess: () => addToast('success', `"${title}" deleted.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  const isMutating = publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending

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
      {isLoading && (
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
      {!isLoading && error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ready State */}
      {!isLoading && !error && (
        <>
          {/* Tabs */}
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
            <button
              type="button"
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
              type="button"
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
                  isMutating={isMutating}
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
  readonly article: ArticleWithSlug
  readonly isDraft: boolean
  readonly isMutating: boolean
  readonly onPublish: (slug: string, title: string) => void
  readonly onUnpublish: (slug: string, title: string) => void
  readonly onDelete: (slug: string, title: string) => void
}

/**
 * Card for a single article with context-aware actions.
 * GitHub URL editing uses the useUpdateMetadata TanStack Query mutation.
 *
 * @param props - Article card properties
 * @returns Article card JSX
 */
function ArticleCard({ article, isDraft, isMutating, onPublish, onUnpublish, onDelete }: ArticleCardProps) {
  const [githubUrl, setGithubUrl] = useState(article.githubUrl ?? '')
  const [githubSaved, setGithubSaved] = useState(false)
  const updateMetadata = useUpdateMetadata()
  const { addToast } = useToastStore()

  /** Whether the local value differs from the DynamoDB value */
  const githubDirty = githubUrl !== (article.githubUrl ?? '')

  /**
   * Saves the GitHub URL to DynamoDB via the metadata mutation.
   * Passing null clears the field; an empty string also clears it.
   */
  function handleGithubSave(): void {
    updateMetadata.mutate(
      {
        slug: article.slug,
        updates: { githubUrl: githubUrl.trim() || null },
      },
      {
        onSuccess: () => {
          setGithubSaved(true)
          addToast('success', 'GitHub URL saved.')
          globalThis.setTimeout(() => setGithubSaved(false), 2000)
        },
        onError: (err) => addToast('error', err.message),
      },
    )
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

      {/* GitHub URL — inline editable */}
      <div className="mt-4 flex items-center gap-2">
        <svg
          className="h-4 w-4 flex-shrink-0 text-zinc-400 dark:text-zinc-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.338c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
          />
        </svg>
        <input
          type="url"
          placeholder="https://github.com/..."
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 placeholder-zinc-400 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder-zinc-500 dark:focus:border-teal-500"
        />
        {githubDirty && (
          <button
            type="button"
            onClick={handleGithubSave}
            disabled={updateMetadata.isPending}
            className="flex-shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
          >
            {updateMetadata.isPending ? 'Saving…' : 'Save'}
          </button>
        )}
        {githubSaved && (
          <span className="flex-shrink-0 text-xs font-medium text-teal-600 dark:text-teal-400">
            ✓ Saved
          </span>
        )}
      </div>

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
            type="button"
            onClick={() => onPublish(article.slug, article.title)}
            disabled={isMutating}
            className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Publish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUnpublish(article.slug, article.title)}
            disabled={isMutating}
            className="rounded-lg border border-amber-300 dark:border-amber-700 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(article.slug, article.title)}
          disabled={isMutating}
          className="ml-auto rounded-lg border border-red-300 dark:border-red-700 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
