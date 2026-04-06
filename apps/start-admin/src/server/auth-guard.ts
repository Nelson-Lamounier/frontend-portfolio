/**
 * @format
 * Server-side authentication guard for TanStack Start server functions.
 *
 * Provides a reusable `requireAuth()` helper that reads the `__session`
 * cookie and verifies the JWT against Cognito JWKS. All protected server
 * functions should call this at the top of their handler.
 */

import { getCookie } from '@tanstack/react-start/server'
import { verifyCognitoJwt } from '@/lib/auth/tanstack-auth'
import type { AuthUser } from './auth'

// =============================================================================
// Error Types
// =============================================================================

/**
 * Thrown when a server function is called without a valid session.
 * Differentiated from generic errors so clients can redirect to login.
 */
export class AuthenticationError extends Error {
  public readonly code = 'UNAUTHENTICATED' as const

  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

// =============================================================================
// Guard Helper
// =============================================================================

/**
 * Verifies the current request has a valid authenticated session.
 *
 * Reads the `__session` HTTP-only cookie, verifies the JWT signature
 * against Cognito's JWKS endpoint, and returns the authenticated user.
 *
 * @returns The authenticated user's ID and email
 * @throws {AuthenticationError} If the cookie is missing or the JWT is invalid
 */
export async function requireAuth(): Promise<AuthUser> {
  const token = getCookie('__session')

  if (!token) {
    throw new AuthenticationError('No session cookie found')
  }

  try {
    const payload = await verifyCognitoJwt(token)
    return {
      id: payload.sub as string,
      email: payload.email as string,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[auth-guard] JWT verification failed:', message)
    throw new AuthenticationError('Session expired or invalid')
  }
}
