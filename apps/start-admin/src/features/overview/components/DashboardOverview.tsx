'use client'

import { Fragment, useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  ArrowUpCircleIcon,
  EllipsisHorizontalIcon,
  PlusSmallIcon,
} from '@heroicons/react/20/solid'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { useAdminArticles } from '@/hooks/use-admin-articles'
import { useAdminComments } from '@/hooks/use-admin-comments'
import { useQuery } from '@tanstack/react-query'
import { getResumesFn } from '../../../server/resumes'
import { finopsQueries, articlePipelineQueries } from '../../reports/queries'
import { Stats } from '../../../components/ui/Stats'

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of recent items to display per section */
const RECENT_LIMIT = 5

const statuses = {
  published: 'bg-green-500/10 text-green-700 dark:text-green-400 ring-green-600/20 dark:ring-green-500/10',
  draft: 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 ring-zinc-300 dark:ring-white/10',
  review: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20 dark:ring-yellow-500/10',
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ring-yellow-600/20 dark:ring-yellow-500/10',
  approved: 'bg-green-500/10 text-green-700 dark:text-green-400 ring-green-600/20 dark:ring-green-500/10',
}

/**
 * Join class names, filtering out falsy values.
 *
 * @param classes - CSS class strings
 * @returns Joined class name string
 */
function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin dashboard overview — matches the ReportContainer visual style
 * but displays overall application metrics (articles, comments, resumes,
 * AI automations) in a single aggregated view.
 *
 * @returns Dashboard overview page JSX
 */
export function DashboardOverview() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'overview' | 'articles' | 'resumes'>('overview')

  const sections = [
    { id: 'overview', name: 'Platform Overview' },
    { id: 'articles', name: 'Content Management' },
    { id: 'resumes', name: 'Career Documents' },
  ]

  // ── TanStack Query hooks ────────────────────────────────────────────────
  const {
    data: articles,
    isLoading: loadingArticles,
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
  const { data: pipelineArticles, isLoading: loadingPipeline } = useQuery(articlePipelineQueries.all())
  const { data: chatbotUsage, isLoading: loadingChatbot } = useQuery(finopsQueries.chatbotUsage(7))
  const { data: selfHealingUsage, isLoading: loadingSelfHealing } = useQuery(finopsQueries.selfHealingUsage(7))

  // ── Derived state ───────────────────────────────────────────────────────
  const isLoading = loadingArticles || loadingComments || loadingResumes || loadingPipeline || loadingChatbot || loadingSelfHealing

  // Article counts
  const draftCount = articles?.draftCount ?? 0
  const publishedCount = articles?.publishedCount ?? 0
  const totalArticles = draftCount + publishedCount

  // Comments
  const pendingComments = comments?.length ?? 0

  // Resumes
  const totalResumes = resumes?.length ?? 0

  // AI Metrics
  const pipelineCount = pipelineArticles?.length ?? 0
  const chatbotRequests = chatbotUsage?.invocationCount ?? 0
  const shInputTokens = selfHealingUsage?.inputTokens ?? 0
  const shOutputTokens = selfHealingUsage?.outputTokens ?? 0
  const shTotalTokens = shInputTokens + shOutputTokens
  const isAgentActive = shTotalTokens > 0

  // ── Stats arrays ────────────────────────────────────────────────────────

  const overviewStats = [
    {
      name: 'Total Articles',
      value: isLoading ? '...' : totalArticles.toString(),
      change: `${draftCount} drafts · ${publishedCount} published`,
      changeType: 'positive',
    },
    {
      name: 'Comments Pending',
      value: isLoading ? '...' : pendingComments.toString(),
      change: pendingComments > 0 ? 'Awaiting moderation' : 'All moderated',
      changeType: pendingComments > 0 ? 'negative' : 'positive',
    },
    {
      name: 'Resume Versions',
      value: isLoading ? '...' : totalResumes.toString(),
      change: 'Active managed documents',
      changeType: 'positive',
    },
    {
      name: 'AI Automations (7d)',
      value: isLoading ? '...' : (pipelineCount + chatbotRequests + (isAgentActive ? 1 : 0)).toString(),
      change: `${pipelineCount} Pipes · ${chatbotRequests} Chats · ${isAgentActive ? 'Agent Active' : 'No Incidents'}`,
      changeType: 'positive',
    },
  ]

  const articleStats = [
    {
      name: 'Published',
      value: isLoading ? '...' : publishedCount.toString(),
      change: 'Live on the portfolio',
      changeType: 'positive',
    },
    {
      name: 'Drafts',
      value: isLoading ? '...' : draftCount.toString(),
      change: 'Awaiting review & publish',
      changeType: draftCount > 0 ? 'negative' : 'positive',
    },
    {
      name: 'AI Generated',
      value: loadingPipeline ? '...' : pipelineCount.toString(),
      change: 'Multi-Agent Pipeline output',
      changeType: 'positive',
    },
    {
      name: 'Comments',
      value: isLoading ? '...' : pendingComments.toString(),
      change: pendingComments > 0 ? `${pendingComments} requiring moderation` : 'All comments moderated',
      changeType: pendingComments > 0 ? 'negative' : 'positive',
    },
  ]

  const resumeStats = [
    {
      name: 'Total Versions',
      value: isLoading ? '...' : totalResumes.toString(),
      change: 'PDF documents managed',
      changeType: 'positive',
    },
    {
      name: 'Active Applications',
      value: '—',
      change: 'Check Applications tab',
      changeType: 'positive',
    },
    {
      name: 'Interview Prep Items',
      value: '—',
      change: 'Company–specific prep kits',
      changeType: 'positive',
    },
    {
      name: 'Cover Letters',
      value: '—',
      change: 'AI–generated cover letters',
      changeType: 'positive',
    },
  ]

  // ── Recent articles list ────────────────────────────────────────────────
  const recentDrafts = articles?.drafts.slice(0, RECENT_LIMIT) ?? []
  const recentPublished = articles?.published.slice(0, RECENT_LIMIT) ?? []

  const allRecent = [
    ...recentPublished.map((a: ArticleWithSlug) => ({ ...a, _status: 'published' as const })),
    ...recentDrafts.map((a: ArticleWithSlug) => ({ ...a, _status: 'draft' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

  const days = [
    {
      date: `Recent Activity (${allRecent.length} records)`,
      dateTime: new Date().toISOString(),
      transactions: allRecent.map((a) => ({
        id: a.slug,
        slug: a.slug,
        status: a._status,
        title: a.title,
        description: a.description || a.aiSummary || 'No description',
        category: a.category || 'Uncategorised',
        date: new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        readingTime: a.readingTimeMinutes ? `${a.readingTimeMinutes} min` : '—',
        icon: ArrowUpCircleIcon,
      })),
    },
  ]

  // ── Pipeline cards ──────────────────────────────────────────────────────
  const pipelines = [
    {
      id: 1,
      name: 'Drafts',
      count: draftCount,
      articles: recentDrafts.slice(0, 4).map((a: ArticleWithSlug) => ({
        title: a.title,
        detail: new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'draft',
      })),
    },
    {
      id: 2,
      name: 'Published',
      count: publishedCount,
      articles: recentPublished.slice(0, 4).map((a: ArticleWithSlug) => ({
        title: a.title,
        detail: new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'published',
      })),
    },
    {
      id: 3,
      name: 'AI Pipeline',
      count: pipelineCount,
      articles: (pipelineArticles ?? []).slice(0, 4).map((a: any) => ({
        title: a.title || a.pk?.replace('ARTICLE#', '') || 'Untitled',
        detail: a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        status: a.status || 'draft',
      })),
    },
  ]

  // ── Quick actions ───────────────────────────────────────────────────────
  const quickActions = [
    { label: 'New Article', href: '/editor/new', description: 'Open the article editor' },
    { label: 'Moderate Comments', href: '/comments', description: `${pendingComments} pending` },
    { label: 'Manage Resumes', href: '/resumes', description: `${totalResumes} version${totalResumes === 1 ? '' : 's'}` },
    { label: 'AI Reports', href: '/reports', description: 'View AI metrics' },
  ]

  // =====================================================================
  // Render
  // =====================================================================

  return (
    <>
      <main>
        <div className="relative isolate overflow-hidden">
          {/* Header */}
          <header className="pt-6 pb-4 sm:pb-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
              <h1 className="text-base/7 font-semibold text-zinc-900 dark:text-white">Dashboard Overview</h1>
              <div className="order-last flex w-full gap-x-8 text-sm/6 font-semibold sm:order-0 sm:w-auto sm:border-l sm:border-zinc-200 dark:sm:border-white/10 sm:pl-6 sm:text-sm/7">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate({ to: action.href } as any)}
                    className="text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <Link
                to="/ai-agent"
                className="ml-auto flex items-center gap-x-1 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
              >
                <PlusSmallIcon aria-hidden="true" className="-ml-1.5 size-5" />
                New article
              </Link>
            </div>
          </header>

          {/* Tabs Navigation */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 mb-4">
            <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-white/10 pb-4">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={classNames(
                    activeSection === section.id
                      ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent',
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors'
                  )}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 mb-12">
            {activeSection === 'overview' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-teal-700 dark:text-teal-400">Platform Metrics</h2>
                </div>
                <Stats stats={overviewStats} />
              </div>
            )}

            {activeSection === 'articles' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-teal-700 dark:text-teal-400">Content Management</h2>
                </div>
                <Stats stats={articleStats} />
              </div>
            )}

            {activeSection === 'resumes' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-teal-700 dark:text-teal-400">Career Documents</h2>
                </div>
                <Stats stats={resumeStats} />
              </div>
            )}
          </div>

          {/* Gradient background decoration */}
          <div
            aria-hidden="true"
            className="absolute top-full left-0 -z-10 mt-96 origin-top-left translate-y-40 -rotate-90 transform-gpu opacity-10 blur-3xl sm:left-1/2 sm:-mt-10 sm:-ml-96 sm:translate-y-0 sm:rotate-0 sm:opacity-30"
          >
            <div
              style={{
                clipPath:
                  'polygon(100% 38.5%, 82.6% 100%, 60.2% 37.7%, 52.4% 32.1%, 47.5% 41.8%, 45.2% 65.6%, 27.5% 23.4%, 0.1% 35.3%, 17.9% 0%, 27.7% 23.4%, 76.2% 2.5%, 74.2% 56%, 100% 38.5%)',
              }}
              className="aspect-1154/678 w-288.5 bg-linear-to-br from-[#FF80B5] to-[#9089FC]"
            />
          </div>
        </div>

        <div className="space-y-16 py-16 xl:space-y-20">
          {/* Recent Activity Table */}
          <div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="mx-auto max-w-2xl text-base font-semibold text-zinc-900 dark:text-white lg:mx-0 lg:max-w-none">
                Recent Activity
              </h2>
            </div>
            <div className="mt-6 overflow-hidden border-t border-zinc-200 dark:border-zinc-700/30">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
                  <table className="w-full text-left">
                    <thead className="sr-only">
                      <tr>
                        <th>Article</th>
                        <th className="hidden sm:table-cell">Category</th>
                        <th>More details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => (
                        <Fragment key={day.dateTime}>
                          <tr className="text-sm/6 text-zinc-900 dark:text-white">
                            <th scope="colgroup" colSpan={3} className="relative isolate py-2 font-semibold">
                              <time dateTime={day.dateTime}>{day.date}</time>
                              <div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/2.5" />
                              <div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/2.5" />
                            </th>
                          </tr>
                          {day.transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td className="relative py-5 pr-6">
                                <div className="flex gap-x-6">
                                  <transaction.icon
                                    aria-hidden="true"
                                    className="hidden h-6 w-5 flex-none text-zinc-500 sm:block"
                                  />
                                  <div className="flex-auto">
                                    <div className="text-sm/6 font-medium text-zinc-900 dark:text-white">{transaction.title}</div>
                                    <div className="mt-1 text-xs/5 text-zinc-400">{transaction.description}</div>
                                  </div>
                                </div>
                                <div className="absolute right-full bottom-0 h-px w-screen bg-zinc-200 dark:bg-white/5" />
                                <div className="absolute bottom-0 left-0 h-px w-screen bg-zinc-200 dark:bg-white/5" />
                              </td>
                              <td className="hidden py-5 pr-6 sm:table-cell">
                                <div className="flex items-start gap-x-3">
                                  <div className="text-sm/6 text-zinc-700 dark:text-white">{transaction.category}</div>
                                  <div
                                    className={classNames(
                                      statuses[transaction.status as keyof typeof statuses] || statuses.draft,
                                      'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                    )}
                                  >
                                    {transaction.status}
                                  </div>
                                </div>
                                <div className="mt-1 flex gap-2 text-xs/5 text-zinc-500 dark:text-zinc-400">
                                  <span>{transaction.date}</span>
                                  <span>&middot;</span>
                                  <span>{transaction.readingTime} read</span>
                                </div>
                              </td>
                              <td className="py-5 text-right">
                                <div className="flex justify-end">
                                  <Link
                                    to="/articles"
                                    className="text-sm/6 font-medium text-teal-700 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300"
                                  >
                                    View<span className="hidden sm:inline"> article</span>
                                    <span className="sr-only">
                                      , {transaction.title}
                                    </span>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Cards */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
              <div className="flex items-center justify-between">
                <h2 className="text-base/7 font-semibold text-zinc-900 dark:text-white">Content Pipeline</h2>
                <Link to="/articles" className="text-sm/6 font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300">
                  View all articles &rarr;
                </Link>
              </div>
              <ul role="list" className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8">
                {pipelines.map((pipeline) => (
                  <li key={pipeline.id} className="overflow-hidden rounded-xl outline -outline-offset-1 outline-zinc-200 dark:outline-white/10">
                    <div className="flex items-center gap-x-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/50 p-6">
                      <div className="text-sm/6 font-semibold text-zinc-900 dark:text-white">{pipeline.name}</div>
                      <div className="ml-2 rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400 ring-1 ring-inset ring-teal-500/20">
                        {pipeline.count}
                      </div>
                      <Menu as="div" className="relative ml-auto">
                        <MenuButton className="relative block text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                          <span className="absolute -inset-2.5" />
                          <span className="sr-only">Open options</span>
                          <EllipsisHorizontalIcon aria-hidden="true" className="size-5" />
                        </MenuButton>
                        <MenuItems
                          transition
                          className="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-white dark:bg-zinc-800 py-2 shadow-lg ring-1 ring-zinc-200 dark:ring-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                        >
                          <MenuItem>
                            <Link
                              to="/articles"
                              className="block px-3 py-1 text-sm/6 text-zinc-700 dark:text-white hover:bg-zinc-50 dark:data-focus:bg-white/5 data-focus:outline-hidden"
                            >
                              View list
                            </Link>
                          </MenuItem>
                        </MenuItems>
                      </Menu>
                    </div>
                    <dl className="-my-3 divide-y divide-zinc-200 dark:divide-white/10 px-6 py-4 text-sm/6">
                      {pipeline.articles.map((article) => (
                        <div key={article.title} className="flex flex-col py-3">
                          <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white truncate" title={article.title}>{article.title}</dt>
                          <dd className="mt-1 flex justify-between gap-x-4 text-xs/5 text-zinc-500 dark:text-zinc-400">
                            <span>{article.detail}</span>
                            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{article.status}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-base/7 font-semibold text-zinc-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate({ to: action.href } as any)}
                  className="group flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/50 p-4 text-left transition-all hover:border-teal-500/30 hover:bg-zinc-100 dark:hover:bg-white/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 ring-1 ring-inset ring-teal-500/20">
                    <PlusSmallIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {action.label}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
