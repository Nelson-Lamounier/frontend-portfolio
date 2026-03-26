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

  // Use __Secure- cookie prefix instead of the default __Host- prefix.
  // __Host- cookies require exact host matching and no Domain attribute,
  // which breaks behind the CloudFront → Traefik → Pod proxy chain.
  // __Secure- only requires the Secure flag — compatible with proxied setups.
  useSecureCookies: true,
  cookies: {
    csrfToken: {
      name: '__Secure-authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },

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
        const expectedUsername = process.env.ADMIN_USERNAME
        const expectedPassword = process.env.ADMIN_PASSWORD

        if (!expectedUsername || !expectedPassword) {
          console.error('[auth] ADMIN_USERNAME or ADMIN_PASSWORD not configured')
          return null
        }

        const username = credentials?.username
        const password = credentials?.password

        if (typeof username !== 'string' || typeof password !== 'string') {
          return null
        }

        const usernameMatch = timingSafeEqual(username, expectedUsername)
        const passwordMatch = timingSafeEqual(password, expectedPassword)

        if (usernameMatch && passwordMatch) {
          return {
            id: 'admin',
            name: 'Admin',
            email: 'admin@portfolio.local',
          }
        }

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
