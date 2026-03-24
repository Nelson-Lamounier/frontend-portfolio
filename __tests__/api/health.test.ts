/**
 * Unit tests for /api/health route handler.
 *
 * Tests that:
 * - Returns 200 with status "healthy"
 * - Includes a valid ISO timestamp
 * - Does NOT expose server internals (uptime, memory, environment)
 * - Sets Cache-Control to no-store
 */

// ========================================
// Mocks
// ========================================

jest.mock('next/server', () => {
  class MockNextResponse {
    body: string
    status: number
    headers: Map<string, string>

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = new Map(Object.entries(init?.headers ?? {}))
    }

    async text() {
      return this.body
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const resp = new MockNextResponse(JSON.stringify(data), init)
      resp.headers.set('Content-Type', 'application/json')
      return resp
    }
  }

  return { NextResponse: MockNextResponse }
})

// ========================================
// Tests
// ========================================

describe('/api/health', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 200 with status "healthy"', async () => {
    const { GET } = require('@/app/api/health/route')
    const response = await GET()

    expect(response.status).toBe(200)

    const body = JSON.parse(await response.text())
    expect(body.status).toBe('healthy')
  })

  it('includes a valid ISO timestamp', async () => {
    const { GET } = require('@/app/api/health/route')
    const response = await GET()

    const body = JSON.parse(await response.text())
    expect(body.timestamp).toBeDefined()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('does NOT expose server internals', async () => {
    const { GET } = require('@/app/api/health/route')
    const response = await GET()

    const body = JSON.parse(await response.text())

    // These fields were previously exposed and should now be absent
    expect(body.uptime).toBeUndefined()
    expect(body.memory).toBeUndefined()
    expect(body.environment).toBeUndefined()
  })

  it('sets Cache-Control to no-store', async () => {
    const { GET } = require('@/app/api/health/route')
    const response = await GET()

    expect(response.headers.get('Cache-Control')).toContain('no-store')
  })

  it('exports dynamic = force-dynamic', () => {
    const mod = require('@/app/api/health/route')
    expect(mod.dynamic).toBe('force-dynamic')
  })

  it('exports revalidate = 0', () => {
    const mod = require('@/app/api/health/route')
    expect(mod.revalidate).toBe(0)
  })
})
