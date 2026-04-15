'use client'

import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import {
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  XMarkIcon,
  BriefcaseIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart3,
  Activity,
  Gauge,
  GitBranch,
  LineChart,
  HeartPulse,
  MessageSquareText,
  ExternalLink,
  LogOut,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { HeaderNav } from '../ui/HeaderNav'
import avatarImage from '@/images/avatar.jpg'

/** Primary sidebar navigation links. */
const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Comments', href: '/comments', icon: MessageSquareText },
  { name: 'Applications', href: '/applications', icon: BriefcaseIcon },
  { name: 'Articles', href: '/articles', icon: DocumentDuplicateIcon },
  { name: 'Resumes', href: '/resumes', icon: DocumentTextIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Reports', href: '/reports', icon: ChartPieIcon },
  { name: 'Test Components', href: '/test', icon: BeakerIcon },
] as const

/** External observability tool links rendered in the sidebar secondary section. */
const observabilityLinks = [
  { id: 1, name: 'Grafana', href: 'https://ops.nelsonlamounier.com/grafana', icon: BarChart3 },
  { id: 2, name: 'Prometheus', href: 'https://ops.nelsonlamounier.com/prometheus', icon: Activity },
  { id: 3, name: 'Prometheus Metrics', href: 'https://ops.nelsonlamounier.com/prometheus/metrics', icon: Gauge },
  { id: 4, name: 'ArgoCD', href: 'https://ops.nelsonlamounier.com/argocd/', icon: GitBranch },
  { id: 5, name: 'Google Analytics', href: 'https://analytics.google.com', icon: LineChart },
  { id: 6, name: 'Health Check', href: 'https://nelsonlamounier.com/api/health', icon: HeartPulse },
] as const

/**
 * Merges conditional class strings, filtering out falsy values.
 *
 * @param classes - Variadic list of class strings or falsy values.
 * @returns A single space-joined class string.
 */
function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Props for the {@link AppLayout} component.
 */
interface AppLayoutProps {
  /** Page content rendered in the main area. */
  children: React.ReactNode
  /**
   * When `true`, skips wrapping `children` in the default `<main>` padding shell.
   * Useful for full-bleed pages (e.g. data-table views).
   * @default false
   */
  disableMainWrapper?: boolean
}

/**
 * Primary dashboard shell for the admin app.
 *
 * Renders a responsive two-column layout with:
 * - A mobile off-canvas drawer (Headless UI `Dialog`)
 * - A fixed desktop sidebar (`lg` breakpoint and above)
 * - A sticky top `HeaderNav` with theme toggle and profile menu
 * - An optional padded `<main>` wrapper
 *
 * All colours use semantic Zinc/Teal tokens with full `dark:` variants.
 * The sidebar background uses `zinc-900 dark` / `zinc-50 light` appearance.
 *
 * @param props - {@link AppLayoutProps}
 */
export default function AppLayout({ children, disableMainWrapper = false }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /**
   * Handles sign-out, delegating to the server-side logout function.
   * Falls back to `/login` if the server returns no redirect URL.
   */
  const handleSignOut = async () => {
    let targetUrl = '/login'
    try {
      const { logoutFn } = await import('@/server/auth')
      const res = await logoutFn()
      if (res?.logoutUrl) {
        targetUrl = res.logoutUrl
      }
    } catch {
      // Ignore errors — navigate to login as fallback.
    }
    globalThis.location.href = targetUrl
  }

  return (
    <>
      {/* =========================================================
          Mobile Off-Canvas Sidebar
         ========================================================= */}
      <div>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          {/* Backdrop */}
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-zinc-800/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
              {/* Close button */}
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                  </button>
                </div>
              </TransitionChild>

              {/* Mobile sidebar panel */}
              <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-zinc-900 px-6 pb-2 ring ring-zinc-200 dark:ring-zinc-700/50">
                {/* Logo */}
                <div className="relative flex h-16 shrink-0 items-center">
                  <SidebarLogo />
                </div>

                {/* Navigation */}
                <nav className="relative flex flex-1 flex-col">
                  <SidebarNavList />
                  <SidebarObservability />
                  <SidebarFooter onSignOut={handleSignOut} />
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* =========================================================
            Desktop Fixed Sidebar
           ========================================================= */}
        <div className="hidden bg-white dark:bg-zinc-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-zinc-200 dark:border-zinc-700/50 px-6">
            {/* Logo */}
            <div className="flex h-16 shrink-0 items-center">
              <SidebarLogo />
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col">
              <SidebarNavList />
              <SidebarObservability />
              <SidebarFooter onSignOut={handleSignOut} />
            </nav>
          </div>
        </div>

        {/* =========================================================
            Main Content Area
           ========================================================= */}
        <div className="lg:pl-72 flex flex-col min-h-screen">
          <HeaderNav
            onOpenSidebar={() => setSidebarOpen(true)}
            onSignOut={handleSignOut}
            userAvatar={avatarImage as unknown as string}
            userEmail="admin@nelsonlamounier.com"
          />

          {disableMainWrapper ? (
            children
          ) : (
            <main className="py-10 flex-1">
              <div className="px-4 sm:px-6 lg:px-8">{children}</div>
            </main>
          )}
        </div>
      </div>
    </>
  )
}

/* --------------------------------------------------------------------------
   Sub-components extracted to reduce render-tree depth
   -------------------------------------------------------------------------- */

/** Teal brand monogram logo mark used in both mobile and desktop sidebars. */
function SidebarLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="32" height="32" className="h-8 w-8" aria-label="NL Admin">
      <circle cx="18" cy="18" r="18" fill="#0d9488" />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        NL
      </text>
    </svg>
  )
}

/** Primary navigation link list rendered inside sidebar `<nav>`. */
function SidebarNavList() {
  return (
    <ul role="list" className="flex flex-1 flex-col gap-y-7">
      <li>
        <ul role="list" className="-mx-2 space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href as string}
                activeProps={{ className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' }}
                inactiveProps={{
                  className: 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white',
                }}
                className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold transition-colors"
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      aria-hidden="true"
                      className={classNames(
                        isActive ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-400 group-hover:text-teal-600 dark:group-hover:text-teal-400',
                        'size-6 shrink-0 transition-colors',
                      )}
                    />
                    {item.name}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </li>
    </ul>
  )
}

/** Observability external links section rendered below primary navigation. */
function SidebarObservability() {
  return (
    <li className="mt-auto">
      <div className="text-xs/6 font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Observability</div>
      <ul role="list" className="-mx-2 space-y-1">
        {observabilityLinks.map((link) => (
          <li key={link.name}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={classNames(
                'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white',
                'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold transition-colors',
              )}
            >
              <span
                className={classNames(
                  'border-zinc-200 dark:border-zinc-700 text-zinc-400 group-hover:border-zinc-300 dark:group-hover:border-zinc-600 group-hover:text-teal-600 dark:group-hover:text-teal-400',
                  'flex size-6 shrink-0 items-center justify-center rounded-lg border bg-zinc-100 dark:bg-zinc-800 text-[0.625rem] font-medium transition-colors',
                )}
              >
                <link.icon aria-hidden="true" className="size-4 shrink-0" />
              </span>
              <span className="truncate">{link.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </li>
  )
}

/**
 * Bottom footer section of the sidebar containing the "Back to Site" link
 * and the avatar + sign-out row.
 *
 * @param props.onSignOut - Sign-out callback.
 */
function SidebarFooter({ onSignOut }: { onSignOut: () => void }) {
  return (
    <li className="-mx-6 mt-6">
      {/* Back to site */}
      <a
        href="https://nelsonlamounier.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
        Back to Site
      </a>

      {/* User row */}
      <div className="flex items-center gap-x-4 border-t border-zinc-200 dark:border-zinc-700/50 px-6 py-3">
        <img
          alt="Admin avatar"
          src={avatarImage as unknown as string}
          className="size-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700"
        />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm/6 font-medium text-zinc-900 dark:text-white">Admin</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">admin@nelsonlamounier.com</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          title="Sign Out"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </li>
  )
}
