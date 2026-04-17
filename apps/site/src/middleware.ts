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
 * Next.js middleware — runs in Edge Runtime on every matched request.
 *
 * Responsibilities:
 * 1. Security headers: applied to every response
 *
 * Note: prom-client uses Node.js APIs incompatible with Edge Runtime.
 * Metrics are tracked in Node.js API routes (/api/metrics, /api/track-error)
 * which run in the Node.js runtime where prom-client works correctly.
 *
 * @param request - Incoming Next.js request
 */
export default function middleware(_request: NextRequest) {
  const response = NextResponse.next()

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value)
  }

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
