/**
 * Public Site Layout
 *
 * Wraps all public-facing pages (home, about, articles, projects, etc.)
 * with the portfolio's Layout component (Header + Footer) and ChatWidget.
 *
 * This layout lives inside the `(site)` route group, which is invisible
 * in the URL path. Admin pages are excluded from this layout — they
 * have their own dedicated AdminDashboard shell.
 *
 * Route group: /(site)/*
 */

import { Layout } from '@/components/layout'
import { ChatWidget } from '@/components/chat'

/**
 * Site layout — renders the public header, footer, and chat widget
 * around child page content.
 *
 * @param props - Layout props with children
 * @returns Public site layout JSX
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="flex w-full">
        <Layout>{children}</Layout>
      </div>
      <ChatWidget />
    </>
  )
}
