/**
 * Admin Dashboard Layout Shell
 *
 * Provides the persistent dark-mode sidebar navigation for all authenticated
 * admin pages. Fully isolated from the public site's Layout (no Header/Footer).
 *
 * Features:
 * - **Dark mode only**: Wrapped in `dark` class — all `dark:` variants activate
 * - **Avatar image**: Uses the portfolio logo (`@/images/avatar.jpg`)
 * - **Sectioned navigation**: Content section + Tools section
 * - **"Back to Site" link**: Navigate to the public portfolio
 * - **Live badge counts**: Articles and comments counts from API
 * - **Responsive**: Collapsible mobile sidebar via Headless UI Dialog
 *
 * @example
 * ```tsx
 * <AdminDashboard user={session?.user}>
 *   {children}
 * </AdminDashboard>
 * ```
 */

'use client'

import { useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import {
  Menu as MenuIcon,
  MessageSquareText,
  FileText,
  Home,
  Files,
  PenLine,
  X,
  LogOut,
  Bot,
  Target,
  ExternalLink,
  ChevronDown,
  Activity,
  BarChart3,
  GitBranch,
  Gauge,
  LineChart,
  HeartPulse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import avatarImage from '@/images/avatar.jpg'
import { useAdminArticles } from '@/lib/hooks/use-admin-articles'
import { useAdminComments } from '@/lib/hooks/use-admin-comments'

// =============================================================================
// TYPES
// =============================================================================

/** User session information displayed in the sidebar footer */
interface AdminUser {
  readonly name?: string | null
  readonly email?: string | null
  readonly image?: string | null
}

/** Props for the AdminDashboard layout shell */
interface AdminDashboardProps {
  /** Authenticated user session info (from NextAuth) */
  readonly user?: AdminUser | null
  /** Child page content rendered in the main area */
  readonly children: React.ReactNode
}

/** Navigation item configuration */
interface NavItem {
  readonly name: string
  readonly href: string
  readonly icon: LucideIcon
  /** Route prefix used for active-state matching */
  readonly matchPrefix: string
}

/** Navigation section with a label and items */
interface NavSection {
  readonly label: string
  readonly items: readonly NavItem[]
}

/** External link for the Observability dropdown */
interface ExternalLinkItem {
  readonly name: string
  readonly href: string
  readonly icon: LucideIcon
  readonly description: string
}



// =============================================================================
// NAVIGATION CONFIGURATION
// =============================================================================

const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: 'Content',
    items: [
      { name: 'Overview',    href: '/admin',            icon: Home,              matchPrefix: '/admin__exact' },
      { name: 'Articles',    href: '/admin/drafts',     icon: FileText,          matchPrefix: '/admin/drafts' },
      { name: 'New Article', href: '/admin/editor/new', icon: PenLine,           matchPrefix: '/admin/editor' },
      { name: 'Comments',    href: '/admin/comments',   icon: MessageSquareText, matchPrefix: '/admin/comments' },
      { name: 'Resumes',     href: '/admin/resumes',    icon: Files,             matchPrefix: '/admin/resumes' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'AI Agent',    href: '/admin/ai-agent',    icon: Bot,    matchPrefix: '/admin/ai-agent' },
      { name: 'Strategist',  href: '/admin/strategist',  icon: Target, matchPrefix: '/admin/strategist' },
    ],
  },
] as const

/**
 * External observability links — open in new tabs.
 * Grouped under a collapsible "Observability" section in the sidebar.
 */
const OBSERVABILITY_LINKS: readonly ExternalLinkItem[] = [
  {
    name: 'Grafana',
    href: 'https://ops.nelsonlamounier.com/grafana',
    icon: BarChart3,
    description: 'Dashboards & alerting',
  },
  {
    name: 'Prometheus',
    href: 'https://ops.nelsonlamounier.com/prometheus',
    icon: Activity,
    description: 'Metrics query UI',
  },
  {
    name: 'Prometheus Metrics',
    href: 'https://ops.nelsonlamounier.com/prometheus/metrics',
    icon: Gauge,
    description: 'Raw metrics endpoint',
  },
  {
    name: 'ArgoCD',
    href: 'https://ops.nelsonlamounier.com/argocd/',
    icon: GitBranch,
    description: 'GitOps deployments',
  },
  {
    name: 'Google Analytics',
    href: 'https://analytics.google.com',
    icon: LineChart,
    description: 'Traffic & engagement',
  },
  {
    name: 'Health Check',
    href: 'https://nelsonlamounier.com/api/health',
    icon: HeartPulse,
    description: 'Application status',
  },
] as const

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Concatenates CSS class names, filtering out falsy values.
 *
 * @param classes - Class name strings (falsy values are ignored)
 * @returns Combined class string
 */
function classNames(...classes: Array<string | boolean | undefined | null>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Determines whether a navigation item is active based on the current pathname.
 *
 * @param matchPrefix - The route prefix to match against
 * @param pathname - Current browser pathname
 * @returns Whether the nav item should appear active
 */
function isNavActive(matchPrefix: string, pathname: string): boolean {
  if (matchPrefix === '/admin__exact') {
    return pathname === '/admin'
  }
  return pathname.startsWith(matchPrefix)
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Admin dashboard layout shell with dark-mode-only responsive sidebar.
 *
 * @param props - Dashboard props including user session and children
 * @returns Admin layout JSX
 */
export default function AdminDashboard({ user, children }: AdminDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [obsOpen, setObsOpen] = useState(false)
  const pathname = usePathname()

  // ── Badge counts via TanStack Query (auto-refreshed on cache invalidation) ──
  const { data: articles } = useAdminArticles()
  const { data: comments } = useAdminComments()

  /**
   * Handles user sign-out via a form POST to the NextAuth endpoint.
   */
  const handleSignOut = useCallback(async () => {
    try {
      const csrfRes = await fetch('/api/auth/csrf')
      const csrfData = (await csrfRes.json()) as { csrfToken: string }

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/auth/signout'

      const csrfInput = document.createElement('input')
      csrfInput.type = 'hidden'
      csrfInput.name = 'csrfToken'
      csrfInput.value = csrfData.csrfToken

      const callbackInput = document.createElement('input')
      callbackInput.type = 'hidden'
      callbackInput.name = 'callbackUrl'
      callbackInput.value = '/admin/login'

      form.appendChild(csrfInput)
      form.appendChild(callbackInput)
      document.body.appendChild(form)
      form.submit()
    } catch {
      globalThis.location.href = '/admin/login'
    }
  }, [])

  /**
   * Returns the badge count for a given navigation item.
   *
   * @param matchPrefix - The nav item's route match prefix
   * @returns Badge count, or undefined if no badge should be shown
   */
  const getBadgeCount = useCallback(
    (matchPrefix: string): number | undefined => {
      switch (matchPrefix) {
        case '/admin/drafts': {
          const total = (articles?.draftCount ?? 0) + (articles?.publishedCount ?? 0)
          return total > 0 ? total : undefined
        }
        case '/admin/comments': {
          const pending = comments?.length ?? 0
          return pending > 0 ? pending : undefined
        }
        default:
          return undefined
      }
    },
    [articles, comments],
  )

  // ── Sidebar content (shared between mobile and desktop) ─────────────────

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Admin Portal
        </span>
      </div>

      {/* Navigation sections */}
      <nav className="flex flex-1 flex-col">
        <ul className="flex flex-1 flex-col gap-y-6">
          {NAV_SECTIONS.map((section) => (
            <li key={section.label}>
              {/* Section label */}
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {section.label}
              </p>
              <ul className="mt-2 -mx-2 space-y-0.5">
                {section.items.map((item) => {
                  const active = isNavActive(item.matchPrefix, pathname)
                  const badge = getBadgeCount(item.matchPrefix)

                  return (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className={classNames(
                          active
                            ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 shadow-sm shadow-teal-500/5'
                            : 'text-zinc-400 border-l-2 border-transparent hover:bg-zinc-800/60 hover:text-zinc-200 hover:border-zinc-600',
                          'group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.01]',
                        )}
                      >
                        <item.icon
                          aria-hidden="true"
                          className={classNames(
                            active
                              ? 'text-teal-400'
                              : 'text-zinc-500 group-hover:text-zinc-300',
                            'size-[18px] shrink-0 transition-colors duration-200',
                          )}
                        />
                        {item.name}
                        {badge !== undefined && (
                          <span
                            className={classNames(
                              active
                                ? 'bg-teal-500/20 text-teal-300'
                                : 'bg-zinc-700 text-zinc-300',
                              'ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium transition-all duration-300',
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}

          {/* Observability section */}
          <li>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Observability
            </p>
            <div className="mt-2 -mx-2">
              {/* Toggle button */}
              <button
                type="button"
                onClick={() => setObsOpen((prev) => !prev)}
                className="group flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
              >
                <Activity
                  aria-hidden="true"
                  className="size-[18px] shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                />
                Monitoring Links
                <ChevronDown
                  className={classNames(
                    'ml-auto h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500',
                    obsOpen && 'rotate-180',
                  )}
                />
              </button>

              {/* Collapsible links */}
              {obsOpen && (
                <ul className="mt-1 space-y-0.5 pl-3">
                  {OBSERVABILITY_LINKS.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                      >
                        <link.icon
                          aria-hidden="true"
                          className="size-[16px] shrink-0 text-zinc-400 transition-colors group-hover:text-teal-600 dark:text-zinc-500 dark:group-hover:text-teal-400"
                        />
                        <span className="flex-1">
                          {link.name}
                          <span className="block text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                            {link.description}
                          </span>
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-zinc-300 dark:text-zinc-600" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>

          {/* Spacer */}
          <li className="flex-1" />

          {/* Back to Site */}
          <li className="-mx-2">
            <Link
              href="/"
              className="group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300"
            >
              <ExternalLink
                aria-hidden="true"
                className="size-[18px] shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-400"
              />
              Back to Site
            </Link>
          </li>

          {/* User Profile + Sign Out */}
          <li className="-mx-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700/60 dark:bg-zinc-800/40">
              <div className="flex items-center gap-x-3">
                {/* Avatar */}
                <Image
                  src={avatarImage}
                  alt="Admin avatar"
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {user?.name ?? 'Admin'}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {user?.email ?? 'Not signed in'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600/60 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </li>
        </ul>
      </nav>
    </>
  )

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* ── Mobile sidebar ──────────────────────────────────────────── */}
        <Dialog
          open={sidebarOpen}
          onClose={setSidebarOpen}
          className="relative z-50 lg:hidden"
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X aria-hidden="true" className="size-6 text-white" />
                  </button>
                </div>
              </TransitionChild>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-zinc-200 bg-white px-6 pb-4 dark:border-zinc-800 dark:bg-zinc-900">
                {sidebarContent}
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* ── Desktop sidebar ─────────────────────────────────────────── */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-zinc-200 bg-white px-6 pb-4 dark:border-zinc-800 dark:bg-zinc-900">
            {sidebarContent}
          </div>
        </div>

        {/* ── Mobile top bar ──────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 flex items-center gap-x-4 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <span className="sr-only">Open sidebar</span>
            <MenuIcon aria-hidden="true" className="size-6" />
          </button>
          <div className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Admin Portal
          </div>
          <Image
            src={avatarImage}
            alt="Admin avatar"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-600"
          />
        </div>

        {/* ── Main content area ───────────────────────────────────────── */}
        <main className="lg:pl-72">
          <div className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
            {children}
          </div>
        </main>
    </div>
  )
}
