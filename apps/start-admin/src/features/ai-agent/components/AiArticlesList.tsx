import { useState } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid'
import { useAdminArticles } from '@/hooks/use-admin-articles'
import type { ArticleWithSlug, ArticleStatus } from '@/lib/types/article.types'

import { Pagination } from '#/components/ui/Pagination'
import { DashboardDrawer } from '#/components/ui/DashboardDrawer'
import { ArticleEditorDrawerContent } from '#/features/articles/components/ArticleEditorDrawerContent'

/**
 * Maps an ArticleStatus to a display label for the badge.
 *
 * @param status - The article pipeline status
 * @returns Human-readable label
 */
function statusLabel(status: ArticleStatus): string {
  const labels: Record<ArticleStatus, string> = {
    draft: 'Draft',
    processing: 'Processing',
    review: 'In Review',
    published: 'Published',
    rejected: 'Rejected',
    archived: 'Archived',
  }
  return labels[status]
}

/**
 * Returns Tailwind classes for the status badge based on pipeline stage.
 *
 * @param status - The article pipeline status
 * @returns CSS class string for the badge
 */
function statusClasses(status: ArticleStatus): string {
  switch (status) {
    case 'published':
      return 'bg-green-400/10 text-green-400 inset-ring inset-ring-green-500/20'
    case 'archived':
    case 'rejected':
      return 'bg-yellow-400/10 text-yellow-500 inset-ring inset-ring-yellow-400/20'
    default:
      return 'bg-zinc-400/10 text-zinc-400 inset-ring inset-ring-zinc-400/20'
  }
}

/**
 * Formats an ISO date string into a human-readable format.
 *
 * @param dateStr - ISO date string (e.g. "2025-03-17")
 * @returns Formatted date (e.g. "17 March 2025")
 */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function AiArticlesList() {
  const { data, isLoading, error, refetch } = useAdminArticles()

  const articles: ArticleWithSlug[] = [
    ...(data?.drafts ?? []),
    ...(data?.published ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const [currentPage, setCurrentPage] = useState(1)
  const [editingArticle, setEditingArticle] = useState<ArticleWithSlug | null>(null)
  const ITEMS_PER_PAGE = 5
  const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE)
  const paginatedArticles = articles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  function handlePreview(slug: string) {
    const baseUrl = import.meta.env?.PROD
      ? 'https://nelsonlamounier.com'
      : 'http://localhost:3000'
    globalThis.window.open(`${baseUrl}/articles/${slug}`, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading articles from DynamoDB…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
        <p className="text-sm text-red-400">{error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colours"
        >
          Retry
        </button>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="border-2 border-dashed border-white/10 rounded-lg p-12 text-center text-zinc-500">
        No articles found. Push a Markdown draft to trigger the Bedrock pipeline.
      </div>
    )
  }

  return (
    <>
      <ul role="list" className="divide-y divide-white/5">
        {paginatedArticles.map((article) => (
        <li key={article.slug} className="flex items-center justify-between gap-x-6 py-5">
          <div className="min-w-0">
            <div className="flex items-start gap-x-3">
              <button
                type="button"
                onClick={() => handlePreview(article.slug)}
                className="text-sm/6 text-left font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                {article.title}
              </button>
              {article.status ? (
                <p
                  className={`mt-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium ${statusClasses(article.status)}`}
                >
                  {statusLabel(article.status)}
                </p>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-zinc-400">
              <p className="whitespace-nowrap">
                <time dateTime={article.date}>{formatDate(article.date)}</time>
              </p>
              <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                <circle r={1} cx={1} cy={1} />
              </svg>
              <p className="truncate">By {article.author}</p>
              {article.readingTimeMinutes ? (
                <>
                  <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                    <circle r={1} cx={1} cy={1} />
                  </svg>
                  <p>{article.readingTimeMinutes} min read</p>
                </>
              ) : null}
            </div>
            {article.tags && article.tags.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-indigo-400/10 px-1.5 py-0.5 text-xs font-medium text-indigo-400 inset-ring inset-ring-indigo-400/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-none items-center gap-x-4">
            <Menu as="div" className="relative flex-none">
              <MenuButton className="relative block text-zinc-400 hover:text-white">
                <span className="absolute -inset-2.5" />
                <span className="sr-only">Open options</span>
                <EllipsisVerticalIcon aria-hidden="true" className="size-5" />
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-zinc-800 py-2 outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <MenuItem>
                  <button
                    type="button"
                    onClick={() => setEditingArticle(article)}
                    className="block w-full text-left px-3 py-1 text-sm/6 text-white data-focus:bg-white/5 data-focus:outline-hidden"
                  >
                    Edit<span className="sr-only">, {article.title}</span>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    type="button"
                    onClick={() => handlePreview(article.slug)}
                    className="block w-full text-left px-3 py-1 text-sm/6 text-white data-focus:bg-white/5 data-focus:outline-hidden"
                  >
                    Preview<span className="sr-only">, {article.title}</span>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    className="block w-full text-left px-3 py-1 text-sm/6 text-white data-focus:bg-white/5 data-focus:outline-hidden"
                  >
                    Delete<span className="sr-only">, {article.title}</span>
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </li>
      ))}
    </ul>
      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <DashboardDrawer
        isOpen={!!editingArticle}
        onClose={() => setEditingArticle(null)}
        title="Edit Article"
        description={editingArticle?.title ?? ''}
        unstyledContent
      >
        {editingArticle && (
          <div className="flex h-full flex-col overflow-hidden">
            <ArticleEditorDrawerContent
              slug={editingArticle.slug}
              onClose={() => setEditingArticle(null)}
            />
          </div>
        )}
      </DashboardDrawer>
    </>
  )
}
