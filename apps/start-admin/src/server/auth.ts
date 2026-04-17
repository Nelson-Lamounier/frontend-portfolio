/**
 * @format
 * Authentication server functions for TanStack Start admin dashboard.
 *
 * Handles OAuth PKCE flow with AWS Cognito, session management via
 * secure HTTP-only cookies, and JWT verification.
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  verifyCognitoJwt,
  generateRandomString,
  generateCodeChallenge,
} from '@/lib/auth/tanstack-auth'
import { securityHeadersMiddleware } from './security-headers'

// =============================================================================
// Types
// =============================================================================

/** Authenticated user shape shared across the admin dashboard */
export interface AuthUser {
  id: string
  email: string
}

/** Authentication state for router context */
export interface AuthState {
  user: AuthUser | null
}

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Reads the secure HTTP-only `__session` cookie and verifies the JWT.
 * This is used by the router to populate auth context — it must NOT
 * call `requireAuth()` since it is the source of auth state.
 */
export const getUserSessionFn = createServerFn({ method: 'GET' })
  .middleware([securityHeadersMiddleware])
  .handler(async (): Promise<AuthUser | null> => {
    const token = getCookie('__session')
    if (!token) return null

    try {
      const payload = await verifyCognitoJwt(token)
      return {
        id: payload.sub as string,
        email: payload.email as string,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[auth] JWT verification failed:', message)
      // Clear the stale cookie so the browser stops sending it on every request.
      // Without this, an expired token causes this error to repeat indefinitely
      // until the cookie's own maxAge (24 h) elapses.
      deleteCookie('__session', { path: '/' })
      return null
    }
  },
)

/**
 * Initiates the OAuth PKCE flow.
 * Generates verifier, sets cookie, and returns the Cognito authorisation URL.
 */
export const getLoginUrlFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const codeVerifier = generateRandomString(64)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateRandomString(32)

    // Store verifier + state for the callback route
    setCookie('pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 mins
      path: '/',
    })

    setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })

    const domain = process.env.AUTH_COGNITO_DOMAIN
    const clientId = process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID
    if (!domain) throw new Error('Missing AUTH_COGNITO_DOMAIN')
    if (!clientId) throw new Error('Missing Cognito Client ID')

    const authUrl = new URL(`https://${domain}/oauth2/authorize`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'email openid profile')

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5001'
    const scheme = appUrl.startsWith('https://') ? 'https' : 'http'
    const host = appUrl.replace(/^https?:\/\//, '')
    const redirectUri = `${scheme}://${host}/admin/auth/callback`

    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return authUrl.toString()
  },
)

/** Logs the user out by clearing session cookies and returning logout URL. */
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  deleteCookie('__session', { path: '/' })
  deleteCookie('pkce_verifier', { path: '/' })
  deleteCookie('oauth_state', { path: '/' })

  const domain = process.env.AUTH_COGNITO_DOMAIN
  const clientId = process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID
  const appUrl = process.env.VITE_APP_URL || 'http://localhost:5001'
  const scheme = appUrl.startsWith('https://') ? 'https' : 'http'
  const host = appUrl.replace(/^https?:\/\//, '')
  const logoutUri = `${scheme}://${host}/admin/login`

  let logoutUrl = '/admin/login'
  if (domain && clientId) {
    const url = new URL(`https://${domain}/logout`)
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('logout_uri', logoutUri)
    logoutUrl = url.toString()
  }

  return { success: true, logoutUrl }
})

// =============================================================================
// Auth Callback Input Schema
// =============================================================================

const authCallbackSchema = z.object({
  code: z.string().min(1, 'Authorisation code is required'),
  state: z.string().min(1, 'OAuth state parameter is required'),
})

/**
 * Handles the OAuth callback — exchanges the authorisation code for tokens,
 * verifies the CSRF state parameter, and sets the session cookie.
 *
 * @throws If PKCE verifier or OAuth state cookies are missing/mismatched
 */
export const handleAuthCallbackFn = createServerFn({ method: 'POST' })
  .inputValidator(authCallbackSchema)
  .handler(async ({ data }) => {
    const { code, state } = data
    const codeVerifier = getCookie('pkce_verifier')

    if (!codeVerifier) {
      throw new Error('Missing PKCE verifier cookie — session may have expired')
    }

    // Verify CSRF state parameter — always required
    const storedState = getCookie('oauth_state')
    if (!storedState) {
      throw new Error('Missing OAuth state cookie — session may have expired')
    }
    if (state !== storedState) {
      throw new Error('OAuth state mismatch — potential CSRF attack')
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5001'
    const scheme = appUrl.startsWith('https://') ? 'https' : 'http'
    const host = appUrl.replace(/^https?:\/\//, '')
    const redirectUri = `${scheme}://${host}/admin/auth/callback`

    const { exchangeCognitoCode } = await import('@/lib/auth/tanstack-auth')
    const tokenRes = await exchangeCognitoCode(code, codeVerifier, redirectUri)

    setCookie('__session', tokenRes.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    deleteCookie('pkce_verifier', { path: '/' })
    deleteCookie('oauth_state', { path: '/' })

    return { success: true }
  })
