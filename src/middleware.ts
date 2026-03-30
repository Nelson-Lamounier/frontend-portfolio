/** @format */

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextAuthRequest } from 'next-auth'

// =============================================================================
// Constants
// =============================================================================

/** Admin login page path — excluded from protection to avoid redirect loops */
const ADMIN_LOGIN_PATH = '/admin/login'

// =============================================================================
// Security Response Headers
// =============================================================================

/**
 * Standard security headers applied to every response.
 * These provide defence-in-depth alongside CloudFront/WAF edge protections.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

// =============================================================================
// Route Protection Helpers
// =============================================================================

/**
 * Determines whether the given pathname requires an authenticated admin session.
 * Excludes the login page itself to prevent redirect loops.
 *
 * @param pathname - The request URL pathname
 * @returns Whether the route is a protected admin route
 */
function isProtectedAdminRoute(pathname: string): boolean {
  return (
    (pathname.startsWith('/admin') && !pathname.startsWith(ADMIN_LOGIN_PATH)) ||
    pathname.startsWith('/api/admin')
  )
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Next.js middleware — runs on every matched request.
 *
 * Responsibilities:
 * 1. Route protection: admin pages/APIs require an active NextAuth.js session.
 *    Auth.js v5 skips its built-in redirect when a custom middleware function
 *    is provided, so **this function must enforce auth redirects explicitly**.
 * 2. Security headers: applied to every response
 * 3. Metrics tracking: request timing for Prometheus
 *
 * @param request - Incoming Next.js request, augmented with `.auth` by Auth.js
 */
export default auth(async function middleware(request: NextAuthRequest) {
  const { pathname } = request.nextUrl

  // ── Route protection ──────────────────────────────────────────────────
  // Auth.js augments the request with `request.auth` (the current session).
  // When a user-defined middleware function is passed to auth(), Auth.js
  // delegates control entirely to this function and does NOT perform its
  // own redirect. We must handle unauthenticated access explicitly.
  if (isProtectedAdminRoute(pathname)) {
    const isAuthenticated = !!request.auth?.user

    if (!isAuthenticated) {
      // Admin API routes: return 401 JSON (don't redirect fetch() calls)
      if (pathname.startsWith('/api/admin')) {
        return Response.json(
          { error: 'Unauthorised — admin session required' },
          { status: 401 },
        )
      }

      // Admin pages: redirect to the login page with a callback URL
      const signInUrl = request.nextUrl.clone()
      signInUrl.pathname = ADMIN_LOGIN_PATH
      signInUrl.searchParams.set('callbackUrl', request.nextUrl.href)
      return NextResponse.redirect(signInUrl)
    }
  }

  // ── Build response with security headers ──────────────────────────────
  const start = Date.now()
  const response = NextResponse.next()
  const duration = (Date.now() - start) / 1000

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value)
  }

  // ── Track metrics asynchronously (fire and forget) ────────────────────
  Promise.all([
    import('@/lib/observability/metrics'),
    import('@/lib/observability/request-tracker'),
  ])
    .then(([{ trackRequestDuration, trackApiCall }, { trackRequestSize }]) => {
      const status = response.status
      const method = request.method
      const path = pathname

      // Track request duration (Prometheus histogram)
      trackRequestDuration(method, path, status, duration)

      // Track request/response sizes (Prometheus histogram)
      trackRequestSize(request, response)

      // Track API calls specifically
      if (path.startsWith('/api/')) {
        trackApiCall(path, method, status)
      }
    })
    .catch(() => {
      // Silently fail — don't break the request
    })

  return response
})

/**
 * Configure which routes to run middleware on.
 * Exclude static files, images, and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
