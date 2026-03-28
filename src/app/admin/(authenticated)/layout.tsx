/**
 * Admin Authenticated Layout
 *
 * Wraps all authenticated admin pages with:
 * 1. QueryProvider — TanStack Query context (scoped to admin only)
 * 2. AdminDashboard — sidebar shell
 * 3. ToastContainer — global notification renderer
 *
 * The login page is excluded from this layout (it sits outside the route group).
 *
 * Route group: /admin/(authenticated)/*
 * All child pages inherit this sidebar layout.
 */

import { auth } from '@/lib/auth'
import AdminDashboard from '@/components/admin/AdminDashboard'
import QueryProvider from '@/components/providers/QueryProvider'
import ToastContainer from '@/components/admin/ToastContainer'

/**
 * Layout component for authenticated admin pages.
 * Renders the QueryProvider + AdminDashboard sidebar shell around all child content.
 *
 * @param props - Layout props with children
 * @returns Admin layout with sidebar and query context
 */
export default async function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <QueryProvider>
      <AdminDashboard user={session?.user}>
        {children}
      </AdminDashboard>
      <ToastContainer />
    </QueryProvider>
  )
}
