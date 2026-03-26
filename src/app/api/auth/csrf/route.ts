/**
 * CSRF Token Stub Route
 *
 * Returns an empty CSRF token as valid JSON. Required because:
 * 1. `skipCSRFCheck` (from @auth/core) disables Auth.js's CSRF endpoint
 * 2. `signIn()` from `next-auth/react` still calls GET /api/auth/csrf
 * 3. Without this route, Next.js returns an HTML 404 page
 * 4. The client-side signIn() crashes trying to parse HTML as JSON
 *
 * The empty token is accepted by the server because skipCSRFCheck
 * bypasses CSRF validation entirely.
 *
 * @see https://authjs.dev/getting-started/installation
 */

import { NextResponse } from 'next/server'

/**
 * Returns an empty CSRF token as JSON.
 *
 * @returns JSON response with empty csrfToken
 */
export function GET(): NextResponse {
  return NextResponse.json({ csrfToken: '' })
}
