/**
 * Admin Login Page — Cognito OAuth Landing
 *
 * Styled landing page with a "Sign in" button that triggers
 * the AWS Cognito Hosted UI OAuth flow via NextAuth.js.
 *
 * Route: /admin/login
 * Access: Public (unauthenticated users are redirected here)
 */

'use client'

import { signIn } from 'next-auth/react'
import { Suspense, useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// =============================================================================
// INNER COMPONENT (uses useSearchParams)
// =============================================================================

/**
 * Login landing page that triggers the Cognito OAuth flow.
 *
 * @returns Login landing page JSX
 */
function AdminLoginContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/drafts'
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Initiates the Cognito OAuth sign-in flow.
   * Forces a JSON response (redirect: false) to prevent CORS issues with the 302 redirect,
   * then manually navigates to the Cognito Hosted UI URL.
   */
  const handleSignIn = useCallback(async () => {
    setIsLoading(true)
    const response = await signIn('cognito', { callbackUrl, redirect: false })
    
    // Top-level navigation circumvents the AJAX CORS block!
    if (response?.url) {
      window.location.href = response.url
    } else {
      setIsLoading(false)
    }
  }, [callbackUrl])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Admin Portal
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in with your AWS credentials to manage content.
          </p>
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-950"
        >
          {/* Hover shine effect */}
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Redirecting…
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
                Sign In with AWS
              </>
            )}
          </span>
        </button>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <svg
            className="h-3.5 w-3.5"
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
          <span>Secured by AWS Cognito · Session expires after 24 hours</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PAGE COMPONENT (wraps inner component in Suspense)
// =============================================================================

/**
 * Admin login page — wraps the content in a Suspense boundary
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
      <AdminLoginContent />
    </Suspense>
  )
}
