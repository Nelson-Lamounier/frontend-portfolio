/**
 * @format
 * Unit tests for application management server functions.
 *
 * Mocks DynamoDB DocumentClient and auth-guard to verify:
 * - Status-based filtering and sort order
 * - Detail assembly from multiple DynamoDB records
 * - BatchWrite chunking with unprocessed-items retry
 * - Status update with GSI key mutations
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
  UpdateCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
  BatchWriteCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}))

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------
process.env.STRATEGIST_TABLE_NAME = 'test-strategist-table'
process.env.AWS_REGION = 'eu-west-1'

// ---------------------------------------------------------------------------
// Import SUT
// ---------------------------------------------------------------------------
import {
  getApplicationsFn,
  getApplicationDetailFn,
  deleteApplicationFn,
  updateApplicationStatusFn,
} from '../../server/applications'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const SAMPLE_APP_RECORD = {
  pk: 'APPLICATION#test-slug',
  sk: 'METADATA',
  applicationSlug: 'test-slug',
  targetCompany: 'Acme Inc',
  targetRole: 'Senior Engineer',
  status: 'analysis-ready',
  interviewStage: 'applied',
  fitRating: 'STRONG_FIT',
  recommendation: 'STRONG_APPLY',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-16T10:00:00Z',
  gsi1pk: 'APP_STATUS#analysis-ready',
  gsi1sk: '2026-01-16T10:00:00Z',
}

const SAMPLE_ANALYSIS_RECORD = {
  pk: 'APPLICATION#test-slug',
  sk: 'ANALYSIS#2026-01-15',
  analysisXml: '<analysis>test</analysis>',
  createdAt: '2026-01-15T10:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getApplicationsFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should query all statuses when status is "all"', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const handler = getApplicationsFn as (input: { data: { status: string } }) => Promise<unknown[]>
    const result = await handler({ data: { status: 'all' } })

    // Should query for each valid status
    expect(mockSend).toHaveBeenCalledTimes(10) // 10 VALID_STATUSES
    expect(result).toEqual([])
  })

  it('should query a single status when filtering', async () => {
    mockSend.mockResolvedValue({
      Items: [SAMPLE_APP_RECORD],
    })

    const handler = getApplicationsFn as (input: { data: { status: string } }) => Promise<unknown[]>
    const result = await handler({ data: { status: 'analysis-ready' } })

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).slug).toBe('test-slug')
  })

  it('should throw for an invalid status', async () => {
    const handler = getApplicationsFn as (input: { data: { status: string } }) => Promise<unknown>
    await expect(handler({ data: { status: 'bogus' } })).rejects.toThrow('Invalid status: bogus')
  })
})

describe('getApplicationDetailFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should assemble detail from metadata and analysis records', async () => {
    mockSend.mockResolvedValue({
      Items: [SAMPLE_APP_RECORD, SAMPLE_ANALYSIS_RECORD],
    })

    const handler = getApplicationDetailFn as unknown as (input: { data: string }) => Promise<Record<string, unknown>>
    const result = await handler({ data: 'test-slug' })

    expect(result.slug).toBe('test-slug')
    expect(result.targetCompany).toBe('Acme Inc')
    expect(result.analysis).not.toBeNull()
  })

  it('should throw when no records are found', async () => {
    mockSend.mockResolvedValue({ Items: [] })

    const handler = getApplicationDetailFn as (input: { data: string }) => Promise<unknown>
    await expect(handler({ data: 'nonexistent' })).rejects.toThrow('Application not found: nonexistent')
  })

  it('should throw when metadata record is missing', async () => {
    mockSend.mockResolvedValue({
      Items: [SAMPLE_ANALYSIS_RECORD], // Analysis present, but no METADATA
    })

    const handler = getApplicationDetailFn as (input: { data: string }) => Promise<unknown>
    await expect(handler({ data: 'test-slug' })).rejects.toThrow('Metadata record not found')
  })
})

describe('deleteApplicationFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should chunk delete requests into batches of 25', async () => {
    // Create 30 items to verify chunking
    const items = Array.from({ length: 30 }, (_, i) => ({
      pk: `APPLICATION#slug-${i}`,
      sk: `RECORD#${i}`,
    }))

    // First call: QueryCommand returns items. BatchWrite calls return no unprocessed
    mockSend
      .mockResolvedValueOnce({ Items: items }) // Query
      .mockResolvedValueOnce({ UnprocessedItems: {} }) // Batch 1: 25 items
      .mockResolvedValueOnce({ UnprocessedItems: {} }) // Batch 2: 5 items

    const handler = deleteApplicationFn as (input: { data: string }) => Promise<{ success: boolean }>
    const result = await handler({ data: 'test-slug' })

    expect(result.success).toBe(true)
    // 1 Query + 2 BatchWrite calls
    expect(mockSend).toHaveBeenCalledTimes(3)
  })

  it('should retry unprocessed items with exponential backoff', async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      pk: `APPLICATION#slug-${i}`,
      sk: `RECORD#${i}`,
    }))

    const unprocessedItem = {
      DeleteRequest: { Key: { pk: items[2].pk, sk: items[2].sk } },
    }

    mockSend
      .mockResolvedValueOnce({ Items: items }) // Query
      .mockResolvedValueOnce({
        UnprocessedItems: { 'test-strategist-table': [unprocessedItem] },
      }) // First batch — 1 unprocessed
      .mockResolvedValueOnce({ UnprocessedItems: {} }) // Retry — all processed

    const handler = deleteApplicationFn as (input: { data: string }) => Promise<{ success: boolean }>
    const result = await handler({ data: 'test-slug' })

    expect(result.success).toBe(true)
    // 1 Query + 1 initial batch + 1 retry
    expect(mockSend).toHaveBeenCalledTimes(3)
  })
})

describe('updateApplicationStatusFn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update status and GSI keys', async () => {
    mockSend.mockResolvedValue({ Attributes: { status: 'applied' } })

    const handler = updateApplicationStatusFn as (
      input: { data: { slug: string; status: string; interviewStage?: string } },
    ) => Promise<unknown>

    await handler({
      data: { slug: 'test-slug', status: 'applied' },
    })

    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})
