/**
 * @format
 * Unit tests for authentication server functions.
 *
 * Mocks TanStack Start cookie utilities and Cognito JWT helpers
 * to verify session management, PKCE flow, and logout behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock: @tanstack/react-start — createServerFn passthrough
// ---------------------------------------------------------------------------
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain: Record<string, unknown> = {}
    chain.middleware = () => chain
    chain.inputValidator = () => chain
    chain.handler = (fn: unknown) => fn
    return chain
  },
}))

// ---------------------------------------------------------------------------
// Mock: @tanstack/react-start/server — cookie utilities
// ---------------------------------------------------------------------------
const mockGetCookie = vi.fn<(name: string) => string | undefined>()
const mockSetCookie = vi.fn()
const mockDeleteCookie = vi.fn()
const mockSetResponseHeader = vi.fn()

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: (...args: unknown[]) => mockGetCookie(...(args as [string])),
  setCookie: (...args: unknown[]) => mockSetCookie(...args),
  deleteCookie: (...args: unknown[]) => mockDeleteCookie(...args),
  setResponseHeader: (...args: unknown[]) => mockSetResponseHeader(...args),
}))

// ---------------------------------------------------------------------------
// Mock: Cognito auth helpers
// ---------------------------------------------------------------------------
const mockVerifyJwt = vi.fn()
const mockGenerateRandomString = vi.fn<(length: number) => string>()
const mockGenerateCodeChallenge = vi.fn<(verifier: string) => Promise<string>>()
const mockExchangeCognitoCode = vi.fn()

vi.mock('@/lib/auth/tanstack-auth', () => ({
  verifyCognitoJwt: (...args: unknown[]) => mockVerifyJwt(...args),
  generateRandomString: (...args: unknown[]) => mockGenerateRandomString(...(args as [number])),
  generateCodeChallenge: (...args: unknown[]) => mockGenerateCodeChallenge(...(args as [string])),
  exchangeCognitoCode: (...args: unknown[]) => mockExchangeCognitoCode(...args),
}))

// ---------------------------------------------------------------------------
// Mock: security-headers middleware (no-op in tests)
// ---------------------------------------------------------------------------
vi.mock('../../server/security-headers', () => ({
  securityHeadersMiddleware: {},
}))

// ---------------------------------------------------------------------------
// Import SUT (after mocks are registered)
// ---------------------------------------------------------------------------
// createServerFn mocks return the handler fn directly, so these exports
// are the raw async handler functions.
import {
  getUserSessionFn,
  getLoginUrlFn,
  handleAuthCallbackFn,
  logoutFn,
} from '../../server/auth'

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------
const COGNITO_DOMAIN = 'auth.example.com'
const COGNITO_CLIENT_ID = 'test-client-id-123'

function setEnvVars(): void {
  process.env.AUTH_COGNITO_DOMAIN = COGNITO_DOMAIN
  process.env.AUTH_COGNITO_ID = COGNITO_CLIENT_ID
  process.env.VITE_APP_URL = 'http://localhost:5001'
  ;(process.env as Record<string, string>).NODE_ENV = 'test'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUserSessionFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnvVars()
  })

  it('should return null when no session cookie is present', async () => {
    mockGetCookie.mockReturnValue(undefined)

    const result = await (getUserSessionFn as () => Promise<unknown>)()

    expect(result).toBeNull()
    expect(mockVerifyJwt).not.toHaveBeenCalled()
  })

  it('should return user when JWT is valid', async () => {
    mockGetCookie.mockReturnValue('valid-jwt-token')
    mockVerifyJwt.mockResolvedValue({
      sub: 'user-123',
      email: 'admin@example.com',
    })

    const result = await (getUserSessionFn as () => Promise<unknown>)()

    expect(result).toEqual({
      id: 'user-123',
      email: 'admin@example.com',
    })
    expect(mockVerifyJwt).toHaveBeenCalledWith('valid-jwt-token')
  })

  it('should return null when JWT verification fails', async () => {
    mockGetCookie.mockReturnValue('invalid-jwt-token')
    mockVerifyJwt.mockRejectedValue(new Error('Token expired'))

    const result = await (getUserSessionFn as () => Promise<unknown>)()

    expect(result).toBeNull()
  })
})

describe('getLoginUrlFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnvVars()
  })

  it('should generate a correct Cognito authorisation URL', async () => {
    mockGenerateRandomString.mockReturnValueOnce('mock-verifier-64')
    mockGenerateRandomString.mockReturnValueOnce('mock-state-32')
    mockGenerateCodeChallenge.mockResolvedValue('mock-challenge')

    const url = await (getLoginUrlFn as () => Promise<string>)()

    expect(url).toContain(`https://${COGNITO_DOMAIN}/oauth2/authorize`)
    expect(url).toContain(`client_id=${COGNITO_CLIENT_ID}`)
    expect(url).toContain('response_type=code')
    expect(url).toContain('code_challenge=mock-challenge')
    expect(url).toContain('code_challenge_method=S256')
    expect(url).toContain('state=mock-state-32')
  })

  it('should set PKCE verifier and state cookies', async () => {
    mockGenerateRandomString.mockReturnValueOnce('mock-verifier')
    mockGenerateRandomString.mockReturnValueOnce('mock-state')
    mockGenerateCodeChallenge.mockResolvedValue('mock-challenge')

    await (getLoginUrlFn as () => Promise<string>)()

    expect(mockSetCookie).toHaveBeenCalledWith(
      'pkce_verifier',
      'mock-verifier',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
    expect(mockSetCookie).toHaveBeenCalledWith(
      'oauth_state',
      'mock-state',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
  })

  it('should throw when AUTH_COGNITO_DOMAIN is missing', async () => {
    delete process.env.AUTH_COGNITO_DOMAIN

    mockGenerateRandomString.mockReturnValue('mock')
    mockGenerateCodeChallenge.mockResolvedValue('mock')

    await expect(
      (getLoginUrlFn as () => Promise<string>)(),
    ).rejects.toThrow('Missing AUTH_COGNITO_DOMAIN')
  })
})

describe('handleAuthCallbackFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnvVars()
  })

  it('should throw when PKCE verifier cookie is missing', async () => {
    mockGetCookie.mockReturnValue(undefined)

    await expect(
      (handleAuthCallbackFn as (input: { data: { code: string; state: string } }) => Promise<unknown>)({
        data: { code: 'auth-code', state: 'state-123' },
      }),
    ).rejects.toThrow('Missing PKCE verifier cookie')
  })

  it('should throw when stored state cookie is missing', async () => {
    mockGetCookie.mockImplementation((name: string) => {
      if (name === 'pkce_verifier') return 'verifier-123'
      return undefined
    })

    await expect(
      (handleAuthCallbackFn as (input: { data: { code: string; state: string } }) => Promise<unknown>)({
        data: { code: 'auth-code', state: 'state-123' },
      }),
    ).rejects.toThrow('Missing OAuth state cookie')
  })

  it('should throw on state mismatch', async () => {
    mockGetCookie.mockImplementation((name: string) => {
      if (name === 'pkce_verifier') return 'verifier-123'
      if (name === 'oauth_state') return 'stored-state'
      return undefined
    })

    await expect(
      (handleAuthCallbackFn as (input: { data: { code: string; state: string } }) => Promise<unknown>)({
        data: { code: 'auth-code', state: 'different-state' },
      }),
    ).rejects.toThrow('OAuth state mismatch')
  })

  it('should exchange code and set session cookie on success', async () => {
    mockGetCookie.mockImplementation((name: string) => {
      if (name === 'pkce_verifier') return 'verifier-123'
      if (name === 'oauth_state') return 'matching-state'
      return undefined
    })
    mockExchangeCognitoCode.mockResolvedValue({
      id_token: 'new-jwt-token',
    })

    const result = await (handleAuthCallbackFn as (input: { data: { code: string; state: string } }) => Promise<unknown>)({
      data: { code: 'auth-code', state: 'matching-state' },
    })

    expect(result).toEqual({ success: true })
    expect(mockSetCookie).toHaveBeenCalledWith(
      '__session',
      'new-jwt-token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
    expect(mockDeleteCookie).toHaveBeenCalledWith('pkce_verifier', { path: '/' })
    expect(mockDeleteCookie).toHaveBeenCalledWith('oauth_state', { path: '/' })
  })
})

describe('logoutFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEnvVars()
  })

  it('should clear all session cookies', async () => {
    const result = await (logoutFn as () => Promise<{ success: boolean; logoutUrl: string }>)()

    expect(result.success).toBe(true)
    expect(mockDeleteCookie).toHaveBeenCalledWith('__session', { path: '/' })
    expect(mockDeleteCookie).toHaveBeenCalledWith('pkce_verifier', { path: '/' })
    expect(mockDeleteCookie).toHaveBeenCalledWith('oauth_state', { path: '/' })
  })

  it('should return a Cognito logout URL when credentials are configured', async () => {
    const result = await (logoutFn as () => Promise<{ success: boolean; logoutUrl: string }>)()

    expect(result.logoutUrl).toContain(`https://${COGNITO_DOMAIN}/logout`)
    expect(result.logoutUrl).toContain(`client_id=${COGNITO_CLIENT_ID}`)
  })

  it('should fall back to /admin/login when Cognito is not configured', async () => {
    delete process.env.AUTH_COGNITO_DOMAIN
    delete process.env.AUTH_COGNITO_ID
    delete process.env.AUTH_COGNITO_CLIENT_ID

    const result = await (logoutFn as () => Promise<{ success: boolean; logoutUrl: string }>)()

    expect(result.logoutUrl).toBe('/admin/login')
  })
})
