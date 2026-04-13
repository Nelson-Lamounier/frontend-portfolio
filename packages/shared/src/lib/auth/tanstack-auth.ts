import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Generates a random crypto string for PKCE code_verifier or state
 */
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = new Uint8Array(length)
  crypto.getRandomValues(values)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length]
  }
  return result
}

/**
 * Generates a SHA-256 code challenge for PKCE
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bufStr = Array.from(new Uint8Array(digest))
    .map((b) => String.fromCodePoint(b))
    .join('')
  return btoa(bufStr)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

/**
 * Validates the Cognito JWT using JWKS and extracts the payload
 */
export async function verifyCognitoJwt(token: string) {
  const issuer = process.env.AUTH_COGNITO_ISSUER || process.env.AUTH_COGNITO_ISSUER_URL || process.env.COGNITO_ISSUER_URL
  if (!issuer) throw new Error('Missing Cognito Issuer Environment Variable')

  const clientId = process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID || process.env.COGNITO_CLIENT_ID
  if (!clientId) throw new Error('Missing Cognito Client ID')

  // The JWKS endpoint is standard for Cognito
  const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`)

  // This caches the JWK internally using jose
  const JWKS = createRemoteJWKSet(jwksUrl)

  // Verify the JWT signature against the Cognito JWKS
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: issuer,
    // Note: Cognito id_token audience matches the clientId
    audience: clientId,
  })

  return payload
}

/**
 * Exchange the authorization code for Cognito tokens
 */
export async function exchangeCognitoCode(code: string, codeVerifier: string, redirectUri: string) {
  const issuer = process.env.AUTH_COGNITO_ISSUER || process.env.AUTH_COGNITO_ISSUER_URL || process.env.COGNITO_ISSUER_URL
  if (!issuer) throw new Error('Missing Cognito Issuer Environment Variable')

  const clientId = process.env.AUTH_COGNITO_ID || process.env.AUTH_COGNITO_CLIENT_ID || process.env.COGNITO_CLIENT_ID
  if (!clientId) throw new Error('Missing Cognito Client ID')

  const domain = process.env.AUTH_COGNITO_DOMAIN
  if (!domain) throw new Error('Missing AUTH_COGNITO_DOMAIN')
  const tokenEndpoint = `https://${domain}/oauth2/token`

  return fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }).toString(),
  }).then(async (res) => {
    if (!res.ok) {
        throw new Error(`Token exchange failed: ${await res.text()}`)
    }
    return res.json()
  })
}
