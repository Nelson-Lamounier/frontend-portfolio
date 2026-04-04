import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { AuthState } from './server/auth'

export interface RouterContext {
  auth: AuthState
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    basepath: '/admin',
    context: {
      auth: { user: null },
    } as RouterContext,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
