/**
 * Unit tests for public-api-engagement.ts
 *
 * The RDS-backed engagement layer proxies to the in-cluster public-api BFF.
 * fetch is mocked — no network needed.
 */

export {}

const DEFAULT_BASE = 'http://public-api.public-api:3001'
const originalEnv = process.env

function okJson(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(data) }
}

describe('public-api-engagement', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.resetModules()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    process.env = { ...originalEnv }
    delete process.env.PUBLIC_API_URL
  })

  afterAll(() => { process.env = originalEnv })

  it('getLikeStatus GETs the like endpoint with sessionId', async () => {
    fetchMock.mockResolvedValue(okJson({ liked: true, likeCount: 4 }))
    const { getLikeStatus } = require('@/lib/articles/public-api-engagement')
    const status = await getLikeStatus('my-post', 'sess-1')

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_BASE}/api/articles/my-post/like?sessionId=sess-1`,
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(status).toEqual({ liked: true, likeCount: 4 })
  })

  it('toggleLike POSTs the sessionId and returns the new state', async () => {
    fetchMock.mockResolvedValue(okJson({ liked: false, likeCount: 3 }))
    const { toggleLike } = require('@/lib/articles/public-api-engagement')
    const status = await toggleLike('my-post', 'sess-1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${DEFAULT_BASE}/api/articles/my-post/like`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ sessionId: 'sess-1' })
    expect(status).toEqual({ liked: false, likeCount: 3 })
  })

  it('getApprovedComments GETs the comments endpoint', async () => {
    fetchMock.mockResolvedValue(okJson([{ commentId: 'c1', name: 'Ada', body: 'Hi', createdAt: '2026-01-01' }]))
    const { getApprovedComments } = require('@/lib/articles/public-api-engagement')
    const comments = await getApprovedComments('my-post')

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_BASE}/api/articles/my-post/comments`,
      expect.any(Object),
    )
    expect(comments).toHaveLength(1)
    expect(comments[0].commentId).toBe('c1')
  })

  it('createComment forwards the client IP as x-forwarded-for and returns the comment', async () => {
    fetchMock.mockResolvedValue(okJson({ commentId: 'new', name: 'Ada', body: 'Nice', createdAt: '2026-02-02' }, 201))
    const { createComment } = require('@/lib/articles/public-api-engagement')
    const comment = await createComment('my-post', 'Ada', 'ada@example.com', 'Nice', '9.9.9.9')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${DEFAULT_BASE}/api/articles/my-post/comments`)
    expect(init.headers['x-forwarded-for']).toBe('9.9.9.9')
    expect(JSON.parse(init.body)).toEqual({ name: 'Ada', email: 'ada@example.com', body: 'Nice' })
    expect(comment.commentId).toBe('new')
  })

  it('createComment throws the upstream message on a non-2xx (so the route can map it)', async () => {
    fetchMock.mockResolvedValue(okJson({ error: 'TooManyRequests', message: 'Rate limit exceeded. Please try again later.' }, 429))
    const { createComment } = require('@/lib/articles/public-api-engagement')

    await expect(
      createComment('my-post', 'Ada', 'ada@example.com', 'Nice', '9.9.9.9'),
    ).rejects.toThrow('Rate limit exceeded')
  })

  it('honours PUBLIC_API_URL override', async () => {
    process.env.PUBLIC_API_URL = 'http://localhost:3001'
    fetchMock.mockResolvedValue(okJson({ liked: false, likeCount: 0 }))
    const { getLikeStatus } = require('@/lib/articles/public-api-engagement')
    await getLikeStatus('p', 's')
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/articles/p/like?sessionId=s')
  })
})
