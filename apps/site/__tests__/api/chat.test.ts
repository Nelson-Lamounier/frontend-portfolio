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

function createRequest(body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
  }
}

async function loadRoute() {
  return require('@/app/api/chat/route') as typeof import('@/app/api/chat/route')
}

describe('/api/chat', () => {
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

  it('returns 503 when the chat service env vars are missing', async () => {
    delete process.env.BEDROCK_AGENT_API_URL
    delete process.env.BEDROCK_API_URL
    delete process.env.BEDROCK_AGENT_API_KEY

    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(response.status).toBe(503)
    expect(JSON.parse(await response.text())).toEqual({
      error: 'Chat service is not configured.',
      code: 'AGENT_ERROR',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses a full chatbot endpoint URL without appending another route', async () => {
    process.env.BEDROCK_AGENT_API_URL = 'https://example.execute-api.eu-west-1.amazonaws.com/v1/invoke-authenticated'
    process.env.BEDROCK_AGENT_API_KEY = 'test-key'

    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: 'Hi from Lami', sessionId: 'session-1' }),
    })

    const { POST } = await loadRoute()
    const response = await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.execute-api.eu-west-1.amazonaws.com/v1/invoke-authenticated',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
      }),
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(await response.text())).toEqual({
      message: 'Hi from Lami',
      sessionId: 'session-1',
    })
  })

  it('appends the default authenticated route when the API URL is a stage root', async () => {
    process.env.BEDROCK_AGENT_API_URL = 'https://example.execute-api.eu-west-1.amazonaws.com/v1/'
    process.env.BEDROCK_AGENT_API_KEY = 'test-key'

    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ response: 'Root URL works', sessionId: 'session-2' }),
    })

    const { POST } = await loadRoute()
    await POST(createRequest({ prompt: 'Hello' }) as never)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.execute-api.eu-west-1.amazonaws.com/v1/invoke-authenticated',
      expect.any(Object),
    )
  })
})
