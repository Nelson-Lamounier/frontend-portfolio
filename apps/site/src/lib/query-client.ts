/**
 * Singleton QueryClient Factory
 *
 * Creates and caches a single QueryClient instance for the admin dashboard.
 * SSR-safe: only caches in the browser to avoid sharing state across requests.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 */

import { QueryClient } from '@tanstack/react-query'

/** Default stale time for admin queries (60 seconds) */
const ADMIN_STALE_TIME_MS = 60_000

/**
 * Browser-cached QueryClient instance.
 * `undefined` on the server — each SSR request gets a fresh client.
 */
let browserQueryClient: QueryClient | undefined

/**
 * Creates a new QueryClient with admin-optimised defaults.
 *
 * @returns Configured QueryClient instance
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ADMIN_STALE_TIME_MS,
        refetchOnWindowFocus: true,
        retry: 1,
      },
      mutations: {
        onError: (error: Error) => {
          // Global mutation error handler — the toast store will consume this
          console.error('[Admin Mutation Error]', error.message)
        },
      },
    },
  })
}

/**
 * Returns a singleton QueryClient.
 *
 * - **Server**: Always creates a fresh client (avoids cross-request leakage).
 * - **Browser**: Returns the cached client, creating one on first call.
 *
 * @returns QueryClient instance
 */
export function getQueryClient(): QueryClient {
  if (typeof globalThis.window === 'undefined') {
    // Server: always fresh
    return makeQueryClient()
  }

  // Browser: singleton
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }

  return browserQueryClient
}
