/** @format */

export {}

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
      const response = new MockNextResponse(JSON.stringify(data), init)
      response.headers.set('Content-Type', 'application/json')
      return response
    }
  }

  return { NextResponse: MockNextResponse }
})

const originalEnv = process.env

const DEFAULT_PUBLIC_API_URL = 'http://public-api.public-api:3001'
const AUTH_ENDPOINT = '/api/chatbot/authenticated'

function createRequest(body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
  }
}

async function loadRoute() {
  return require('@/app/api/chat/route') as typeof import('@/app/api/chat/route')
}

describe('/api/chat (in-cluster public-api BFF)', () => {
  let fetchMock: jest.Mock
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetModules()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    process.env = { ...originalEnv }
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('proxies to public-api /api/chatbot/authenticated and normalises {response} → {message}', async () => {
    process.env.PUBLIC_API_URL = 'http://public-api.public-api:3001'

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ response: 'Hi from Lami', sessionId: 'session-1' }),
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_PUBLIC_API_URL}${AUTH_ENDPOINT}`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(await response.text())).toEqual({
      message: 'Hi from Lami',
      sessionId: 'session-1',
    })
  })

  it('never forwards an x-api-key (public-api owns the upstream secret)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ response: 'ok', sessionId: 's' }),
    })

    const { POST } = await loadRoute()
    await POST(createRequest({ prompt: 'Hello' }) as never)

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers).not.toHaveProperty('x-api-key')
  })

  it('falls back to the in-cluster default URL when PUBLIC_API_URL is unset', async () => {
    delete process.env.PUBLIC_API_URL

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ response: 'default', sessionId: 's' }),
    })

    const { POST } = await loadRoute()
    await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_PUBLIC_API_URL}${AUTH_ENDPOINT}`,
      expect.any(Object),
    )
  })

  it('forwards sessionId for multi-turn continuity', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ response: 'r', sessionId: 'abc' }),
    })

    const { POST } = await loadRoute()
    await POST(createRequest({ prompt: 'Hello', sessionId: 'abc' }) as never)

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ prompt: 'Hello', sessionId: 'abc' })
  })

  it('rejects an empty prompt with 400 VALIDATION_ERROR', async () => {
    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: '   ' }) as never)

    expect(response.status).toBe(400)
    expect(JSON.parse(await response.text()).code).toBe('VALIDATION_ERROR')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an over-long prompt with 400 VALIDATION_ERROR', async () => {
    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'a'.repeat(10_001) }) as never)

    expect(response.status).toBe(400)
    expect(JSON.parse(await response.text()).code).toBe('VALIDATION_ERROR')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps an upstream 429 to RATE_LIMITED', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: jest.fn().mockResolvedValue({ error: 'TooManyRequests', message: 'slow down' }),
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(response.status).toBe(429)
    expect(JSON.parse(await response.text()).code).toBe('RATE_LIMITED')
  })

  it('maps an upstream 503 to AGENT_ERROR with the upstream message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({ error: 'ChatbotUnavailable', message: 'Chatbot service is not configured' }),
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(response.status).toBe(503)
    const body = JSON.parse(await response.text())
    expect(body.code).toBe('AGENT_ERROR')
    expect(body.error).toBe('Chatbot service is not configured')
  })

  it('maps a network failure to NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(response.status).toBe(502)
    expect(JSON.parse(await response.text()).code).toBe('NETWORK_ERROR')
  })
})
