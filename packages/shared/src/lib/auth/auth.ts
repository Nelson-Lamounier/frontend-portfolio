/**
 * NextAuth.js v5 (Auth.js) Configuration — Cognito Provider
 *
 * Provides admin authentication for the portfolio application using
 * AWS Cognito as the OAuth 2.0 / OIDC identity provider.
 *
 * Authentication flow:
 *   1. User clicks "Sign in" on /admin/login
 *   2. signIn('cognito') redirects to Cognito Hosted UI
 *   3. User authenticates on Cognito (email + password)
 *   4. Cognito redirects back to /api/auth/callback/cognito
 *   5. NextAuth.js creates a JWT session cookie
 *
 * Session strategy: JWT (stateless, stored in HttpOnly cookie)
 *
 * Observability:
 *   - Structured JSON logs for all auth events (AIOps-ready)
 *   - sign-in success/failure, JWT minting, session access, errors
 *   - Log output compatible with CloudWatch Logs Insights
 *
 * Environment Variables:
 *   NEXTAUTH_SECRET              – required, JWT signing secret
 *   NEXTAUTH_URL                 – required, base URL for callbacks
 *   AUTH_COGNITO_USER_POOL_ID    – required, Cognito User Pool ID
 *   AUTH_COGNITO_ID              – required, Cognito User Pool Client ID
 *   AUTH_COGNITO_ISSUER          – required, Cognito OIDC Issuer URL
 *
 * @see https://authjs.dev/getting-started/providers/cognito
 */

import NextAuth from 'next-auth'
import type { Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CognitoProvider from 'next-auth/providers/cognito'



// =============================================================================
// Structured Logger — AIOps-ready JSON logging
// =============================================================================

/** Auth log entry for structured CloudWatch / Loki ingestion */
interface AuthLogEntry {
  service: 'auth'
  event: string
  email?: string | null
  provider?: string | null
  error?: string
  level: 'info' | 'warn' | 'error'
  timestamp: string
  [key: string]: unknown
}

/**
 * Emit a structured JSON log line compatible with CloudWatch Logs Insights.
 * All auth events flow through this function for uniform observability.
 *
 * @param entry - Structured log entry
 */
function authLog(entry: Omit<AuthLogEntry, 'service' | 'timestamp'>): void {
  const output = {
    service: 'auth' as const,
    timestamp: new Date().toISOString(),
    ...entry,
  }

  switch (entry.level) {
    case 'error':
      console.error(JSON.stringify(output))
      break
    case 'warn':
      console.warn(JSON.stringify(output))
      break
    default:
      console.log(JSON.stringify(output))
  }
}

// =============================================================================
// NextAuth Configuration
// =============================================================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the forwarded Host header from reverse proxies (Traefik, CloudFront).
  trustHost: true,

  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  providers: [
    CognitoProvider({
      clientId: process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID || '',
      clientSecret: 'public-client-no-secret',
      issuer: process.env.AUTH_COGNITO_ISSUER || process.env.AUTH_COGNITO_ISSUER_URL || '',
      client: {
        token_endpoint_auth_method: 'none',
      },
      checks: ['pkce'],
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
     * Controls the redirect URL after successful sign-in or sign-out.
     * Overridden to allow cross-origin redirects between localhost:3000 (auth server)
     * and localhost:5001 (TanStack admin) during development.
     */
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      
      // Allow localhost:5001 redirects in development
      if (process.env.NODE_ENV === 'development' && url.startsWith('http://localhost:5001')) {
        return url
      }
      
      return baseUrl
    },

    /**
     * Called after a successful sign-in.
     * Logs the event and allows the sign-in to proceed.
     *
     * @param params - Sign-in callback parameters
     * @returns Whether to allow the sign-in
     */
    signIn({ user, account }) {
      authLog({
        event: 'sign_in_success',
        email: user.email,
        provider: account?.provider,
        level: 'info',
      })
      return true
    },

    /**
     * Called whenever a JWT is created or updated.
     * Enriches the token with Cognito user details on first sign-in.
     *
     * @param params - JWT callback parameters
     * @returns Enriched JWT token
     */
    jwt({ token, account, profile }) {
      // First sign-in — enrich token with Cognito claims
      if (account && profile) {
        token.sub = profile?.sub ?? undefined
        token.email = profile?.email ?? undefined

        authLog({
          event: 'jwt_created',
          email: profile?.email ?? undefined,
          provider: account.provider,
          level: 'info',
          tokenExpiry: account?.expires_at,
        })
      }

      return token
    },

    /**
     * Called whenever a session is checked.
     * Copies enriched JWT fields into the session user object.
     *
     * @param params - Session callback parameters
     * @returns Updated session
     */
    session({ session, token }: { session: Session; token: JWT }) {
      const sess = session as unknown as { user?: Record<string, unknown> }
      if (sess.user && token.sub) {
        sess.user.id = token.sub
        sess.user.email = token.email
      }
      return session
    },

    /**
     * Controls whether a request is authorised.
     *
     * IMPORTANT: When a custom middleware function is passed to `auth()`,
     * Auth.js v5 delegates control entirely to that function and does NOT
     * use the return value of `authorized` for redirect decisions. Route
     * protection (redirects + 401 responses) is therefore enforced in
     * `middleware.ts`, not here.
     *
     * This callback is retained solely for observability — it logs
     * unauthenticated access attempts to admin routes.
     *
     * @param params - Auth callback parameters
     * @returns Always `true` — enforcement is in middleware.ts
     */
    authorized({ auth: session, request }: { auth: { user?: User } | null; request: { nextUrl: URL } }) {
      const { pathname } = request.nextUrl
      const isAdminRoute =
        pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')
      const isAdminApi = pathname.startsWith('/api/admin')

      if ((isAdminRoute || isAdminApi) && !session?.user) {
        authLog({
          event: 'access_denied',
          level: 'warn',
          pathname,
        })
      }

      // Always return true — actual enforcement is in middleware.ts
      return true
    },
  },

  events: {
    /**
     * Fired when a user signs out.
     *
     * @param message - Sign-out event message
     */
    signOut(message: Record<string, unknown>) {
      const msg = message as { token?: { email?: string } }
      authLog({
        event: 'sign_out',
        email: msg?.token?.email,
        level: 'info',
      })
    },
  },

  /** Error logging for auth failures */
  logger: {
    /**
     * Logs auth errors (e.g. OAuth callback failures, token errors).
     *
     * @param code - Error code
     * @param metadata - Error metadata
     */
    error(error: Error) {
      authLog({
        event: 'auth_error',
        error: error.message,
        level: 'error',
        errorCode: error.name,
      })
    },

    /**
     * Logs auth warnings (e.g. deprecated features, configuration issues).
     *
     * @param code - Warning code
     */
    warn(code: string) {
      authLog({
        event: 'auth_warning',
        level: 'warn',
        warningCode: code,
      })
    },
  },

  /** Prevent leaking internal details in error messages */
  debug: false,
})
