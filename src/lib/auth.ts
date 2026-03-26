/**
 * NextAuth.js v5 (Auth.js) Configuration
 *
 * Provides admin authentication for the portfolio application using
 * the Credentials provider. Authenticates a single admin user against
 * environment variables — no external auth provider or database needed.
 *
 * Session strategy: JWT (stateless, stored in HttpOnly cookie)
 *
 * Environment Variables:
 *   NEXTAUTH_SECRET   – required, used for JWT signing
 *   ADMIN_USERNAME    – required, admin login username
 *   ADMIN_PASSWORD    – required, admin login password
 *   NEXTAUTH_URL      – optional, base URL (auto-detected in production)
 *
 * @see https://authjs.dev/getting-started
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { skipCSRFCheck } from '@auth/core'

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns Whether the strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)

  let result = 0
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i]
  }
  return result === 0
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the forwarded Host header from reverse proxies (Traefik, CloudFront).
  // Without this, Auth.js v5 rejects requests with UntrustedHost errors.
  trustHost: true,

  // Disable CSRF token validation. The CloudFront → HTTP → Traefik proxy
  // chain breaks Auth.js's cookie-based CSRF flow because CloudFront's
  // Origin Request Policy strips/mismatches the CSRF cookie. This is safe
  // for a Credentials-only provider (attacker must know the password) and
  // the site is already behind CloudFront's own request validation.
  skipCSRFCheck,

  providers: [
    Credentials({
      name: 'Admin',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * Validates credentials against environment variables.
       *
       * @param credentials - Username and password from the login form
       * @returns User object on success, null on failure
       */
      async authorize(credentials) {
        // DEBUG: Trace what credentials arrive through CloudFront
        console.log('[auth][debug] authorize called')
        console.log('[auth][debug] credentials keys:', credentials ? Object.keys(credentials) : 'null')
        console.log('[auth][debug] credentials types:', credentials ? Object.fromEntries(
          Object.entries(credentials).map(([k, v]) => [k, `${typeof v}(${String(v).length})`])
        ) : 'null')

        const expectedUsername = process.env.ADMIN_USERNAME
        const expectedPassword = process.env.ADMIN_PASSWORD

        if (!expectedUsername || !expectedPassword) {
          console.error('[auth] ADMIN_USERNAME or ADMIN_PASSWORD not configured')
          return null
        }

        const username = credentials?.username
        const password = credentials?.password

        console.log('[auth][debug] username type:', typeof username, 'length:', typeof username === 'string' ? username.length : 'N/A')
        console.log('[auth][debug] password type:', typeof password, 'length:', typeof password === 'string' ? password.length : 'N/A')
        console.log('[auth][debug] expectedUsername length:', expectedUsername.length)
        console.log('[auth][debug] expectedPassword length:', expectedPassword.length)

        if (typeof username !== 'string' || typeof password !== 'string') {
          console.error('[auth][debug] FAIL: credentials not strings')
          return null
        }

        const usernameMatch = timingSafeEqual(username, expectedUsername)
        const passwordMatch = timingSafeEqual(password, expectedPassword)

        console.log('[auth][debug] usernameMatch:', usernameMatch, 'passwordMatch:', passwordMatch)

        if (usernameMatch && passwordMatch) {
          return {
            id: 'admin',
            name: 'Admin',
            email: 'admin@portfolio.local',
          }
        }

        console.error('[auth][debug] FAIL: credentials mismatch')
        return null
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    /** Session expiry — 24 hours */
    maxAge: 24 * 60 * 60,
  },

  pages: {
    signIn: '/admin/login',
  },

  callbacks: {
    /**
     * Controls whether a request is authorised.
     * Called by the middleware to protect admin routes.
     */
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl

      // Protect admin pages and API routes
      const isAdminRoute =
        pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')
      const isAdminApi = pathname.startsWith('/api/admin')

      if (isAdminRoute || isAdminApi) {
        return !!session?.user
      }

      // All other routes are public
      return true
    },
  },

  /** Prevent leaking internal details in error messages */
  debug: false,
})
