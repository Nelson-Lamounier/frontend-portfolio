import { useNavigate } from '@tanstack/react-router'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { useAdminArticles } from '@/hooks/use-admin-articles'
import { useAdminComments } from '@/hooks/use-admin-comments'
import { useQuery } from '@tanstack/react-query'
import { getResumesFn } from '../../../server/resumes'

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of recent articles to display per section */
const RECENT_ARTICLES_LIMIT = 3

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin dashboard overview with stats cards and recent activity.
 * Data is fetched via TanStack Query hooks — loading/error states
 * are derived from hook status.
 *
 * @returns Dashboard overview page JSX
 */
export function DashboardOverview() {
  const navigate = useNavigate()

  // TanStack Query hooks — cached, auto-refreshed
  const {
    data: articles,
    isLoading: loadingArticles,
    error: articlesError,
    refetch: refetchArticles,
  } = useAdminArticles()
  const {
    data: comments,
    isLoading: loadingComments,
  } = useAdminComments()
  const {
    data: resumes,
    isLoading: loadingResumes,
  } = useQuery({
    queryKey: ['admin-resumes'],
    queryFn: () => getResumesFn(),
  })

  // Derived state
  const isLoading = loadingArticles || loadingComments || loadingResumes
  const error = articlesError?.message ?? null

  // Computed stats
  const draftCount = articles?.draftCount ?? 0
  const publishedCount = articles?.publishedCount ?? 0
  const pendingComments = comments?.length ?? 0
  const totalResumes = resumes?.length ?? 0
  const recentDrafts = articles?.drafts.slice(0, RECENT_ARTICLES_LIMIT) ?? []
  const recentPublished = articles?.published.slice(0, RECENT_ARTICLES_LIMIT) ?? []

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Portfolio admin overview — articles, comments, and resume management.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
            <span className="text-sm">Loading dashboard…</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => refetchArticles()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ready State */}
      {!isLoading && !error && (
        <>
          {/* ── Stats Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Draft Articles */}
            <StatsCard
              label="Draft Articles"
              value={draftCount}
              description="Awaiting review & publish"
              accentColour="amber"
              onClick={() => navigate({ to: '/articles' })}
            />

            {/* Published Articles */}
            <StatsCard
              label="Published Articles"
              value={publishedCount}
              description="Live on the portfolio"
              accentColour="teal"
              onClick={() => navigate({ to: '/articles' })}
            />

            {/* Pending Comments */}
            <StatsCard
              label="Pending Comments"
              value={pendingComments}
              description="Awaiting moderation"
              accentColour={pendingComments > 0 ? 'amber' : 'teal'}
              onClick={() => navigate({ to: '/comments' })}
            />

            {/* Resume Versions */}
            <StatsCard
              label="Resume Versions"
              value={totalResumes}
              description="Managed versions"
              accentColour="zinc"
              onClick={() => navigate({ to: '/resumes' })}
            />
          </div>

          {/* ── Quick Actions ────────────────────────────────────────── */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white">
              Quick Actions
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <QuickActionButton
                label="New Article"
                description="Open the article editor"
                onClick={() => navigate({ to: '/editor/new' } as any)}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                }
              />
              <QuickActionButton
                label="Moderate Comments"
                description={`${pendingComments} pending`}
                onClick={() => navigate({ to: '/comments' })}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                  </svg>
                }
              />
              <QuickActionButton
                label="Manage Resumes"
                description={`${totalResumes} version${totalResumes === 1 ? '' : 's'}`}
                onClick={() => navigate({ to: '/resumes' })}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* ── Recent Articles ───────────────────────────────────────── */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Drafts */}
            <RecentArticlesList
              title="Recent Drafts"
              articles={recentDrafts}
              emptyMessage="No draft articles"
              statusBadge="draft"
            />

            {/* Recent Published */}
            <RecentArticlesList
              title="Recently Published"
              articles={recentPublished}
              emptyMessage="No published articles"
              statusBadge="published"
            />
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Accent colour options for stats cards */
type AccentColour = 'teal' | 'amber' | 'zinc'

/** Props for the StatsCard component */
interface StatsCardProps {
  readonly label: string
  readonly value: number
  readonly description: string
  readonly accentColour: AccentColour
  readonly onClick: () => void
}

/** Colour mappings for stats card accents */
const ACCENT_STYLES: Record<AccentColour, { bg: string; text: string; ring: string }> = {
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-200 dark:ring-teal-800',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  zinc: {
    bg: 'bg-zinc-100 dark:bg-zinc-800/50',
    text: 'text-zinc-700 dark:text-zinc-300',
    ring: 'ring-zinc-200 dark:ring-zinc-700',
  },
}

/**
 * Stats summary card with accent colour and click navigation.
 *
 * @param props - Card configuration
 * @returns Stats card JSX
 */
function StatsCard({ label, value, description, accentColour, onClick }: StatsCardProps) {
  const accent = ACCENT_STYLES[accentColour]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border border-zinc-200 bg-white p-5 text-left transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/50`}
    >
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accent.text}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
    </button>
  )
}

/** Props for the QuickActionButton component */
interface QuickActionButtonProps {
  readonly label: string
  readonly description: string
  readonly onClick: () => void
  readonly icon: React.ReactNode
}

/**
 * Quick action navigation button.
 *
 * @param props - Button configuration
 * @returns Quick action button JSX
 */
function QuickActionButton({ label, description, onClick, icon }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-teal-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-teal-700"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400 dark:group-hover:bg-teal-900/40">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {label}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </button>
  )
}

/** Props for the RecentArticlesList component */
interface RecentArticlesListProps {
  readonly title: string
  readonly articles: ArticleWithSlug[]
  readonly emptyMessage: string
  readonly statusBadge: 'draft' | 'published'
}

/**
 * Compact list of recent articles for the dashboard overview.
 *
 * @param props - List configuration
 * @returns Recent articles list JSX
 */
function RecentArticlesList({
  title,
  articles,
  emptyMessage,
  statusBadge,
}: RecentArticlesListProps) {
  const badgeClasses =
    statusBadge === 'draft'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>

      {articles.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400 dark:text-zinc-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-700/50">
          {articles.map((article) => (
            <li key={article.slug} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={`/editor/${article.slug}`}
                    className="text-sm font-medium text-zinc-900 transition-colors hover:text-teal-600 dark:text-zinc-100 dark:hover:text-teal-400"
                  >
                    {article.title}
                  </a>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {article.description || article.aiSummary || 'No description'}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClasses}`}
                >
                  {statusBadge}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                <time dateTime={article.date}>
                  {new Date(article.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
                {article.readingTimeMinutes && (
                  <>
                    <span>·</span>
                    <span>{article.readingTimeMinutes} min read</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
