import { HeadContent, Scripts, createRootRouteWithContext, Outlet, Link } from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RouterContext } from '../router'
import { getUserSessionFn } from '../server/auth'
import { Toaster } from '../components/ui/Toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const user = await getUserSessionFn()
    return { auth: { user } }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Portfolio Admin',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
})

function ErrorComponent({ error }: { error: any }) {
  return (
    <RootDocument>
      <div className="p-4 bg-red-50 text-red-900 h-screen w-screen overflow-auto">
        <h1 className="text-xl font-bold">Root Error Boundary</h1>
        <p className="mt-2 font-semibold">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre className="mt-4 p-4 bg-black/10 rounded overflow-x-auto text-sm">
          {error instanceof Error ? error.stack : JSON.stringify(error)}
        </pre>
      </div>
    </RootDocument>
  )
}

function NotFoundComponent() {
  return (
    <RootDocument>
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4">
        <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors">
          Return to Dashboard
        </Link>
      </div>
    </RootDocument>
  )
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackDevtools />
      </Suspense>
    </QueryClientProvider>
  )
}

import React, { Suspense } from 'react'

const TanStackDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : React.lazy(() =>
        Promise.all([
          import('@tanstack/react-router-devtools'),
          import('@tanstack/react-query-devtools'),
        ]).then(([router, query]) => {
          return {
            default: () => (
              <>
                <router.TanStackRouterDevtools position="bottom-left" />
                <query.ReactQueryDevtools />
              </>
            ),
          }
        }),
      )

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gray-900" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="h-full font-sans antialiased text-white">
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
