import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { handleAuthCallbackFn } from '../server/auth'

/**
 * Zod schema for the OAuth callback search parameters.
 * State is mandatory — prevents CSRF attacks via OAuth state mismatch.
 */
const callbackSearchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/auth/callback')({
  validateSearch: callbackSearchSchema,
  beforeLoad: async ({ search }) => {
    if (search.error) {
      console.error('[auth-callback] Cognito OAuth error:', search.error)
      throw redirect({ to: '/login' })
    }

    if (!search.code) {
      console.error('[auth-callback] Missing authorisation code in callback')
      throw redirect({ to: '/login' })
    }

    if (!search.state) {
      console.error('[auth-callback] Missing OAuth state parameter — potential CSRF')
      throw redirect({ to: '/login' })
    }

    try {
      await handleAuthCallbackFn({ data: { code: search.code, state: search.state } })
    } catch (err: unknown) {
      // Re-throw redirect errors from TanStack Router
      if (
        typeof err === 'object' &&
        err !== null &&
        ('status' in err || 'redirect' in err || 'name' in err)
      ) {
        const errObj = err as Record<string, unknown>
        if (
          errObj.status === 307 ||
          errObj.status === 302 ||
          errObj.name === 'RedirectError' ||
          'redirect' in errObj
        ) {
          throw err
        }
      }

      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      console.error('[auth-callback] Token exchange failed:', { message, stack })
      throw redirect({ to: '/login' })
    }

    if (typeof window !== 'undefined') {
      globalThis.window.location.href = '/admin/'
      await new Promise<void>(() => {}) // freeze until reload
    }
    throw redirect({ to: '/' })
  },
  component: () => (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        <p className="text-zinc-400">Authenticating...</p>
      </div>
    </div>
  ),
})
