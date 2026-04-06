/**
 * @format
 * Unit tests for article management server functions.
 *
 * Mocks DynamoDB DocumentClient and auth-guard to verify:
 * - Article listing with status filtering
 * - Content retrieval
 * - Publish/unpublish status transitions
 * - Article deletion (metadata + content)
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
// Mock: @tanstack/react-start/server — cookie utilities (needed by auth-guard)
// ---------------------------------------------------------------------------
vi.mock('@tanstack/react-start/server', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  setResponseHeader: vi.fn(),
}))

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
// Mock: DynamoDB
// ---------------------------------------------------------------------------
const mockSend = vi.fn()

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: mockSend }),
  },
  QueryCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  UpdateCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  DeleteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}))

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------
process.env.ARTICLES_TABLE_NAME = 'test-articles-table'
process.env.AWS_REGION = 'eu-west-1'

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------
import {
  getArticlesFn,
  getArticleContentFn,
  publishArticleFn,
  unpublishArticleFn,
  deleteArticleFn,
} from '../../server/articles'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const DRAFT_ARTICLE = {
  pk: 'ARTICLES',
  sk: 'ARTICLE#my-draft',
  title: 'Draft Article',
  slug: 'my-draft',
  status: 'draft',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: '2026-01-11T10:00:00Z',
}

const PUBLISHED_ARTICLE = {
  pk: 'ARTICLES',
  sk: 'ARTICLE#my-published',
  title: 'Published Article',
  slug: 'my-published',
  status: 'published',
  publishedAt: '2026-01-12T10:00:00Z',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: '2026-01-12T10:00:00Z',
}

const CONTENT_RECORD = {
  pk: 'ARTICLES',
  sk: 'CONTENT#my-draft',
  content: '# My Draft Article\n\nThis is the content.',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getArticlesFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return all articles when status is "all"', async () => {
    mockSend.mockResolvedValue({
      Items: [DRAFT_ARTICLE, PUBLISHED_ARTICLE],
    })

    const handler = getArticlesFn as (input: { data: { status: string } }) => Promise<unknown[]>
    const result = await handler({ data: { status: 'all' } })

    expect(result).toHaveLength(2)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('should filter by draft status', async () => {
    mockSend.mockResolvedValue({
      Items: [DRAFT_ARTICLE, PUBLISHED_ARTICLE],
    })

    const handler = getArticlesFn as (input: { data: { status: string } }) => Promise<unknown[]>
    const result = await handler({ data: { status: 'draft' } })

    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).slug).toBe('my-draft')
  })

  it('should filter by published status', async () => {
    mockSend.mockResolvedValue({
      Items: [DRAFT_ARTICLE, PUBLISHED_ARTICLE],
    })

    const handler = getArticlesFn as (input: { data: { status: string } }) => Promise<unknown[]>
    const result = await handler({ data: { status: 'published' } })

    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).slug).toBe('my-published')
  })
})

describe('getArticleContentFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return content when it exists', async () => {
    mockSend.mockResolvedValue({ Item: CONTENT_RECORD })

    const handler = getArticleContentFn as (input: { data: string }) => Promise<Record<string, unknown> | null>
    const result = await handler({ data: 'my-draft' })

    expect(result).not.toBeNull()
    expect(result?.content).toContain('# My Draft Article')
  })

  it('should return null when content does not exist', async () => {
    mockSend.mockResolvedValue({ Item: undefined })

    const handler = getArticleContentFn as (input: { data: string }) => Promise<Record<string, unknown> | null>
    const result = await handler({ data: 'nonexistent' })

    expect(result).toBeNull()
  })
})

describe('publishArticleFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update article status to published', async () => {
    mockSend.mockResolvedValue({})

    const handler = publishArticleFn as (input: { data: string }) => Promise<{ success: boolean }>
    const result = await handler({ data: 'my-draft' })

    expect(result.success).toBe(true)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe('unpublishArticleFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update article status to draft', async () => {
    mockSend.mockResolvedValue({})

    const handler = unpublishArticleFn as (input: { data: string }) => Promise<{ success: boolean }>
    const result = await handler({ data: 'my-published' })

    expect(result.success).toBe(true)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe('deleteArticleFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete both metadata and content records', async () => {
    mockSend.mockResolvedValue({})

    const handler = deleteArticleFn as (input: { data: string }) => Promise<{ success: boolean }>
    const result = await handler({ data: 'my-draft' })

    expect(result.success).toBe(true)
    // Should call send twice: once for metadata delete, once for content delete
    expect(mockSend).toHaveBeenCalledTimes(2)
  })
})
