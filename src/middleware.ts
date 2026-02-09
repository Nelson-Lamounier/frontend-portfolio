/** @format */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to track HTTP requests for Prometheus metrics
 * Runs on all routes except static files and internal Next.js routes
 *
 * Middleware always executes server-side in Next.js Edge Runtime,
 * so no `typeof window` guard is needed.
 */
export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const duration = (Date.now() - start) / 1000;

  // Track metrics asynchronously (fire and forget)
  Promise.all([
    import('@/lib/metrics'),
    import('@/lib/request-tracker'),
  ])
    .then(([{ trackRequestDuration, trackApiCall }, { trackRequestSize }]) => {
      const status = response.status;
      const method = request.method;
      const path = request.nextUrl.pathname;

      // Track request duration (Prometheus histogram)
      trackRequestDuration(method, path, status, duration);

      // Track request/response sizes (Prometheus histogram)
      trackRequestSize(request, response);

      // Track API calls specifically
      if (path.startsWith('/api/')) {
        trackApiCall(path, method, status);
      }
    })
    .catch(() => {
      // Silently fail - don't break the request
    });

  return response;
}

/**
 * Configure which routes to run middleware on
 * Exclude static files, images, and Next.js internals
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
