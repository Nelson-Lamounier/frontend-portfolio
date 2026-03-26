/**
 * Admin Login Page
 *
 * Server-rendered login form for the admin panel.
 * Authenticates via NextAuth.js Credentials provider against
 * environment-variable-backed admin credentials.
 *
 * Route: /admin/login
 * Access: Public (unauthenticated users are redirected here)
 */

'use client'

import { Suspense, useCallback, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// =============================================================================
// TYPES
// =============================================================================

type LoginState = 'idle' | 'loading' | 'error'

// =============================================================================
// INNER COMPONENT (uses useSearchParams)
// =============================================================================

/**
 * Login form that reads the callback URL from search params.
 *
 * @returns Login form JSX
 */
function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/drafts'

  const [state, setState] = useState<LoginState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  /**
   * Handles form submission — signs in via NextAuth.js Credentials provider.
   */
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setState('loading')
      setError(null)

      try {
        // Auth.js v5 beta's signIn() from next-auth/react has a
        // ReadableStream parsing bug. Use a direct fetch instead.
        const params = new URLSearchParams({
          username,
          password,
          csrfToken: '',
          callbackUrl,
        })

        const res = await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          redirect: 'follow',
          credentials: 'include',
        })

        // DEBUG: Log response details
        console.log('[login][debug] callback status:', res.status, 'url:', res.url)

        // Auth.js redirects to ?error=CredentialsSignin on failure.
        // If the final URL contains 'error=', credentials were rejected.
        if (res.url.includes('error=')) {
          setError('Invalid username or password.')
          setState('error')
          return
        }

        // Verify session was actually created
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        const session = await sessionRes.json()
        console.log('[login][debug] session after login:', JSON.stringify(session))

        if (!session?.user) {
          setError('Login failed — session was not created.')
          setState('error')
          return
        }

        // Successful login — full page reload to pick up the session cookie
        window.location.href = callbackUrl
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[login][debug] signIn threw:', message, err)
        setError(`Login error: ${message}`)
        setState('error')
      }
    },
    [username, password, callbackUrl, router],
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100">
            <svg
              className="h-6 w-6 text-white dark:text-zinc-900"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Admin Login
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to manage articles and content.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {state === 'error' && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label
              htmlFor="admin-username"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Username
            </label>
            <input
              id="admin-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
              placeholder="Enter your username"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
              placeholder="Enter your password"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
          >
            {state === 'loading' ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Protected admin area · Session expires after 24 hours
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// PAGE COMPONENT (wraps inner component in Suspense)
// =============================================================================

/**
 * Admin login page — wraps the form in a Suspense boundary
 * as required by Next.js 15 for useSearchParams().
 *
 * @returns Login page with Suspense wrapper
 */
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  )
}
