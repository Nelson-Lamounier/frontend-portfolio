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
      clientId: process.env.AUTH_COGNITO_ID!,
      clientSecret: 'public-client-no-secret',
      issuer: process.env.AUTH_COGNITO_ISSUER!,
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
    session({ session, token }) {
      const sess = session as unknown as { user?: Record<string, unknown> }
      if (sess.user && token.sub) {
        sess.user.id = token.sub
        sess.user.email = token.email
      }
      return session
    },

    /**
     * Controls whether a request is authorised.
     * Called by the middleware to protect admin routes.
     *
     * @param params - Auth callback parameters
     * @returns Whether the request is authorised
     */
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl

      // Protect admin pages and API routes
      const isAdminRoute =
        pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')
      const isAdminApi = pathname.startsWith('/api/admin')

      if (isAdminRoute || isAdminApi) {
        const isAuthed = !!session?.user

        if (!isAuthed) {
          authLog({
            event: 'access_denied',
            level: 'warn',
            pathname,
          })
        }

        return isAuthed
      }

      // All other routes are public
      return true
    },
  },

  events: {
    /**
     * Fired when a user signs out.
     *
     * @param message - Sign-out event message
     */
    signOut(message) {
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
    warn(code) {
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
