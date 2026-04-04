import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { verifyCognitoJwt, generateRandomString, generateCodeChallenge } from '@/lib/auth/tanstack-auth'

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  user: AuthUser | null
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Reads the secure HTTP-only __session cookie and verifies the JWT.
 */
export const getUserSessionFn = createServerFn({ method: 'GET' }).inputValidator((d: any) => d).handler(
  async (): Promise<AuthUser | null> => {
    const token = getCookie('__session')
    if (!token) return null

    try {
      const payload = await verifyCognitoJwt(token)
      return {
        id: payload.sub as string,
        email: payload.email as string,
      }
    } catch (err: any) {
      console.warn('Invalid or expired session token', err)
      import('node:fs').then(fs => fs.writeFileSync('/tmp/auth_callback_debug.log', "JWT VERIFY ERROR: " + String(err.stack || err.message)))
      return null
    }
  },
)

/**
 * Initiates the OAuth PKCE flow.
 * Generates verifier, sets cookie, and returns the Cognito authorization URL.
 */
export const getLoginUrlFn = createServerFn({ method: 'POST' }).inputValidator((d: any) => d).handler(
  async () => {
    const codeVerifier = generateRandomString(64)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateRandomString(32)

    // Store verifier for the callback route
    setCookie('pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 mins
      path: '/',
    })

    const domain = process.env.AUTH_COGNITO_DOMAIN
    const clientId = process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID
    if (!domain) throw new Error('Missing AUTH_COGNITO_DOMAIN')
    const authUrl = new URL(`https://${domain}/oauth2/authorize`)
    authUrl.searchParams.set('client_id', clientId!)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'email openid profile')
    const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VITE_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:5001'
    const redirectUri = `${scheme}://${host}/admin/auth/callback`

    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return authUrl.toString()
  },
)

/**
 * Logs the user out.
 */
export const logoutFn = createServerFn({ method: 'POST' }).inputValidator((d: any) => d).handler(async () => {
  deleteCookie('__session', { path: '/' })
  deleteCookie('pkce_verifier', { path: '/' })

  const domain = process.env.AUTH_COGNITO_DOMAIN
  const clientId = process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID
  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = process.env.VITE_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:5001'
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

export const handleAuthCallbackFn = createServerFn({ method: 'POST' }).inputValidator((d: any) => d).handler(
  async (ctx: any) => {
    try {
      const { code } = ctx.data
      const codeVerifier = getCookie('pkce_verifier')
      
      if (!codeVerifier) {
        throw new Error('Missing PKCE verifier cookie')
      }

      const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const host = process.env.VITE_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:5001'
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
      return { success: true }
    } catch (e: any) {
      import('node:fs').then(fs => fs.writeFileSync('/tmp/auth_callback_debug.log', String(e.stack || e.message)))
      throw e
    }
  }
)
