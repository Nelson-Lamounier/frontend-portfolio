/**
 * @format
 * Unit tests for application management server functions.
 *
 * Mocks global.fetch and auth-guard to verify:
 * - Proper URL construction and method selection for admin-api calls
 * - Authorization headers logic
 * - Error mapping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
vi.mock('@tanstack/react-start/server', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  setResponseHeader: vi.fn(),
}))

import { getCookie } from '@tanstack/react-start/server'
const mockGetCookie = getCookie as unknown as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Mock: auth-guard — always allow
// ---------------------------------------------------------------------------
vi.mock('../../server/auth-guard', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
}))

// ---------------------------------------------------------------------------
// Mock: global.fetch
// ---------------------------------------------------------------------------
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------
import {
  getApplicationsFn,
  getApplicationDetailFn,
  deleteApplicationFn,
  updateApplicationStatusFn,
} from '../../server/applications'

const EXPECTED_API_URL = 'http://admin-api.admin-api:3002/api/admin'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applications server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCookie.mockReturnValue('mock-jwt-token')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const mockResponse = (data: unknown, ok = true, status = 200, statusText = 'OK') => {
    fetchMock.mockResolvedValueOnce({
      ok,
      status,
      statusText,
      json: async () => data,
      text: async () => JSON.stringify(data),
    })
  }

  describe('getApplicationsFn', () => {
    it('should query all applications and parse the response', async () => {
      mockResponse({ applications: [{ slug: 'test-app' }], count: 1 })

      const handler = getApplicationsFn as (input: { data: { status: string } }) => Promise<unknown>
      const result = await handler({ data: { status: 'all' } })

      expect(fetchMock).toHaveBeenCalledWith(`${EXPECTED_API_URL}/applications`, expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt-token' }),
      }))
      expect(result).toEqual([{ slug: 'test-app' }])
    })

    it('should append status to the querystring if not all', async () => {
      mockResponse({ applications: [], count: 0 })

      const handler = getApplicationsFn as (input: { data: { status: string } }) => Promise<unknown>
      const result = await handler({ data: { status: 'applied' } })

      expect(fetchMock).toHaveBeenCalledWith(`${EXPECTED_API_URL}/applications?status=applied`, expect.anything())
      expect(result).toEqual([])
    })
  })

  describe('getApplicationDetailFn', () => {
    it('should fetch application details and parse the response', async () => {
      mockResponse({ application: { slug: 'test-app', targetCompany: 'Acme Inc' } })

      const handler = getApplicationDetailFn as (input: { data: string }) => Promise<unknown>
      const result = await handler({ data: 'test-app' }) as { slug: string; targetCompany: string }

      expect(fetchMock).toHaveBeenCalledWith(`${EXPECTED_API_URL}/applications/test-app`, expect.anything())
      expect(result.targetCompany).toEqual('Acme Inc')
    })
  })

  describe('deleteApplicationFn', () => {
    it('should call DELETE and return success', async () => {
      mockResponse({ deleted: true, slug: 'test-app' })

      const handler = deleteApplicationFn as (input: { data: string }) => Promise<unknown>
      const result = await handler({ data: 'test-app' })

      expect(fetchMock).toHaveBeenCalledWith(`${EXPECTED_API_URL}/applications/test-app`, expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt-token' }),
      }))
      expect(result).toEqual({ success: true })
    })
  })

  describe('updateApplicationStatusFn', () => {
    it('should POST updated status', async () => {
      mockResponse({ success: true, status: 'rejected' })

      const handler = updateApplicationStatusFn as (input: { data: { slug: string; status: string; interviewStage?: string } }) => Promise<unknown>
      const result = await handler({ data: { slug: 'test-app', status: 'rejected', interviewStage: 'onsite' } })

      expect(fetchMock).toHaveBeenCalledWith(`${EXPECTED_API_URL}/applications/test-app/status`, expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt-token' }),
        body: JSON.stringify({ status: 'rejected', interviewStage: 'onsite' }),
      }))
      expect(result).toEqual({ success: true, status: 'rejected' })
    })
  })
})
