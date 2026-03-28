/**
 * Admin QueryProvider
 *
 * Client-side wrapper that injects TanStack Query's `QueryClientProvider`
 * into the admin layout tree. ReactQueryDevtools are included only in
 * development builds.
 *
 * This provider is scoped to the admin section — public pages are unaffected.
 *
 * @example
 * ```tsx
 * <QueryProvider>
 *   <AdminDashboard user={session?.user}>
 *     {children}
 *   </AdminDashboard>
 * </QueryProvider>
 * ```
 */

'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query-client'

/**
 * Props for the QueryProvider component.
 */
interface QueryProviderProps {
  /** Child components to wrap with the query context */
  readonly children: React.ReactNode
}

/**
 * Provides TanStack Query context to all admin child components.
 *
 * @param props - Provider props with children
 * @returns Query-enabled component tree
 */
export default function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
