/**
 * @format
 * Unit tests for article management server functions.
 *
 * Mocks global.fetch and auth-guard to verify:
 * - Proper URL construction for admin-api calls
 * - Status query string filtering
 * - 404 handling and null return
 * - Correct HTTP verbs for publish/unpublish/delete/save
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
  AuthenticationError: class AuthenticationError extends Error {
    code = 'UNAUTHENTICATED' as const
    constructor(message = 'Authentication required') {
      super(message)
      this.name = 'AuthenticationError'
    }
  },
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
  getArticlesFn,
  getArticleContentFn,
  publishArticleFn,
  unpublishArticleFn,
  deleteArticleFn,
  saveArticleContentFn,
  saveArticleMetadataFn,
} from '../../server/articles'

const EXPECTED_API_URL = 'http://admin-api.admin-api:3002/api/admin'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(data: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
}

const DRAFT_ARTICLE = {
  pk: 'ARTICLE#my-draft',
  title: 'Draft Article',
  status: 'draft',
  updatedAt: '2026-01-11T10:00:00Z',
}

const ARTICLE_DETAIL = {
  slug: 'my-draft',
  title: 'Draft Article',
  description: 'Test',
  status: 'draft',
  author: 'Test Author',
  date: '2026-01-10',
  contentRef: 's3://bucket/key.mdx',
  content: '# My Draft Article\n\nThis is the content.',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('articles server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCookie.mockReturnValue('mock-jwt-token')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getArticlesFn', () => {
    it('should list all articles without a status filter', async () => {
      mockResponse({ articles: [DRAFT_ARTICLE], count: 1 })

      const handler = getArticlesFn as (i: { data: { status: string } }) => Promise<unknown[]>
      const result = await handler({ data: { status: 'all' } })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/articles`,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt-token' }),
        }),
      )
      expect(result).toEqual([DRAFT_ARTICLE])
    })

    it('should append status to the query string when not "all"', async () => {
      mockResponse({ articles: [DRAFT_ARTICLE], count: 1 })

      const handler = getArticlesFn as (i: { data: { status: string } }) => Promise<unknown[]>
      await handler({ data: { status: 'draft' } })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/articles?status=draft`,
        expect.anything(),
      )
    })
  })

  describe('getArticleContentFn', () => {
    it('should fetch article content from admin-api', async () => {
      mockResponse(ARTICLE_DETAIL)

      const handler = getArticleContentFn as (i: { data: string }) => Promise<unknown>
      const result = await handler({ data: 'my-draft' })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/content/my-draft`,
        expect.anything(),
      )
      expect(result).toEqual(ARTICLE_DETAIL)
    })

    it('should return null when article is not found (404)', async () => {
      mockResponse({ error: 'Article not found' }, false, 404)

      const handler = getArticleContentFn as (i: { data: string }) => Promise<unknown>
      const result = await handler({ data: 'nonexistent' })

      expect(result).toBeNull()
    })
  })

  describe('publishArticleFn', () => {
    it('should call POST /:slug/publish and return success', async () => {
      mockResponse({ queued: true, slug: 'my-draft' })

      const handler = publishArticleFn as (i: { data: string }) => Promise<{ success: boolean }>
      const result = await handler({ data: 'my-draft' })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/articles/my-draft/publish`,
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result.success).toBe(true)
    })
  })

  describe('unpublishArticleFn', () => {
    it('should call PUT /:slug with status draft', async () => {
      mockResponse({ updated: true, slug: 'my-published' })

      const handler = unpublishArticleFn as (i: { data: string }) => Promise<{ success: boolean }>
      const result = await handler({ data: 'my-published' })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/articles/my-published`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'draft' }),
        }),
      )
      expect(result.success).toBe(true)
    })
  })

  describe('deleteArticleFn', () => {
    it('should call DELETE /:slug and return success', async () => {
      mockResponse({ deleted: true, slug: 'my-draft' })

      const handler = deleteArticleFn as (i: { data: string }) => Promise<{ success: boolean }>
      const result = await handler({ data: 'my-draft' })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/articles/my-draft`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt-token' }),
        }),
      )
      expect(result.success).toBe(true)
    })
  })

  describe('saveArticleContentFn', () => {
    it('should call POST /content/:slug with content body', async () => {
      mockResponse({ updated: true, slug: 'my-draft' })

      const handler = saveArticleContentFn as (
        i: { data: { id: string; content: string } },
      ) => Promise<{ success: boolean }>
      const result = await handler({ data: { id: 'my-draft', content: '# Updated content' } })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/content/my-draft`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: '# Updated content' }),
        }),
      )
      expect(result.success).toBe(true)
    })
  })

  describe('saveArticleMetadataFn', () => {
    it('should call PUT /:slug with metadata fields', async () => {
      mockResponse({ updated: true, slug: 'my-draft' })

      const handler = saveArticleMetadataFn as (
        i: { data: { slug: string; title?: string } },
      ) => Promise<{ success: boolean }>
      const result = await handler({ data: { slug: 'my-draft', title: 'New Title' } })

      expect(fetchMock).toHaveBeenCalledWith(
        `${EXPECTED_API_URL}/articles/my-draft`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'New Title' }),
        }),
      )
      expect(result.success).toBe(true)
    })
  })
})
