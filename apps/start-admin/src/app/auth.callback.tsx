import { createFileRoute, redirect } from '@tanstack/react-router'
import { handleAuthCallbackFn } from '../server/auth'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: search.code as string,
      state: search.state as string,
      error: search.error as string,
    }
  },
  beforeLoad: async ({ search }) => {
    if (search.error) {
      console.error('Cognito OAuth Error:', search.error)
      throw redirect({ to: '/login' })
    }

    if (!search.code) {
      throw redirect({ to: '/login' })
    }

    try {
      await (handleAuthCallbackFn as any)({ data: { code: search.code } })
    } catch (err: any) {
      if (err?.status === 307 || err?.status === 302 || err?.name === 'RedirectError' || (typeof err === 'object' && err !== null && 'redirect' in err)) {
        throw err
      }
      console.error('Failed to exchange code:', err)
      import('node:fs').then(fs => fs.writeFileSync('/tmp/auth-error.log', err instanceof Error ? err.message + '\n' + err.stack : String(err))).catch(() => {})
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
