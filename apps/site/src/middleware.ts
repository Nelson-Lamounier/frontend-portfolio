/** @format */

import { type NextRequest, NextResponse } from 'next/server'

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
// Middleware
// =============================================================================

/**
 * Next.js middleware — runs on every matched request.
 *
 * Responsibilities:
 * 1. Security headers: applied to every response
 * 2. Metrics tracking: request timing for Prometheus
 *
 * Note: Authentication is handled exclusively by start-admin (TanStack Start).
 * This public site has no login flow or protected routes.
 *
 * @param request - Incoming Next.js request
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
}

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
