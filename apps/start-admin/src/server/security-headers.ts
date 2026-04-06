/**
 * @format
 * Security headers middleware for the admin dashboard.
 *
 * Uses TanStack Start's `createMiddleware` and `setResponseHeader` to inject
 * security headers into every server function response. Applied to the
 * `getUserSessionFn` which runs on every route via the root `beforeLoad`.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
 */

import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

/**
 * Content Security Policy directive.
 *
 * - `unsafe-inline`/`unsafe-eval` — required for Vite HMR and TanStack hydration
 * - `connect-src` — wide to support Cognito OAuth, AWS services, and Faro RUM
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https:",
  "connect-src 'self' https://*.nelsonlamounier.com https://*.amazonaws.com https://*.amazoncognito.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/**
 * Security headers applied to every server response.
 */
const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Content-Security-Policy', CSP_DIRECTIVES],
] as const

/**
 * TanStack Start server middleware that injects hardened security headers.
 *
 * Apply to any server function via `.middleware([securityHeadersMiddleware])`.
 * Since `getUserSessionFn` runs on every route via `__root.tsx` `beforeLoad`,
 * attaching this middleware there ensures global header coverage.
 */
export const securityHeadersMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next()

    for (const [header, value] of SECURITY_HEADERS) {
      setResponseHeader(header, value)
    }

    return result
  },
)
