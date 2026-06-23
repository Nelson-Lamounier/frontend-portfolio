/**
 * Unit tests for public-api-articles.ts
 *
 * The RDS-backed article data layer. All reads proxy to the in-cluster
 * public-api BFF over HTTP — fetch is mocked, no network needed.
 */

export {}

const DEFAULT_BASE = 'http://public-api.public-api:3001'

const originalEnv = process.env

function okJson(data: unknown) {
  return { ok: true, status: 200, json: jest.fn().mockResolvedValue(data) }
}

const listPayload = {
  items: [
    {
      slug: 'rds-article-one',
      title: 'RDS Article One',
      excerpt: 'First from RDS',
      publishedAt: '2026-02-01T00:00:00.000Z',
      tags: ['aws', 'rds'],
      coverImage: 'https://cdn.example/cover1.jpg',
    },
    {
      slug: 'rds-article-two',
      title: 'RDS Article Two',
      excerpt: null,
      publishedAt: '2026-01-15T00:00:00.000Z',
      tags: ['k8s'],
      coverImage: null,
    },
  ],
  count: 2,
}

const detailPayload = {
  slug: 'rds-article-one',
  title: 'RDS Article One',
  excerpt: 'First from RDS',
  contentMd: '# Hello\n\nBody text.',
  tags: ['aws', 'rds'],
  aiGenerated: true,
  aiModel: 'claude-opus-4-8',
  coverImage: 'https://cdn.example/cover1.jpg',
  publishedAt: '2026-02-01T00:00:00.000Z',
  createdAt: '2026-01-30T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
}

describe('public-api-articles', () => {
  let fetchMock: jest.Mock
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetModules()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    process.env = { ...originalEnv }
    delete process.env.PUBLIC_API_URL
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => consoleErrorSpy.mockRestore())
  afterAll(() => { process.env = originalEnv })

  it('queryPublishedArticles fetches /api/articles and maps to ArticleWithSlug', async () => {
    fetchMock.mockResolvedValue(okJson(listPayload))

    const { queryPublishedArticles } = require('@/lib/articles/public-api-articles')
    const articles = await queryPublishedArticles()

    expect(fetchMock).toHaveBeenCalledWith(`${DEFAULT_BASE}/api/articles`, expect.any(Object))
    expect(articles).toHaveLength(2)
    expect(articles[0]).toMatchObject({
      slug: 'rds-article-one',
      title: 'RDS Article One',
      description: 'First from RDS',
      author: 'Nelson Lamounier',
      date: '2026-02-01',
      tags: ['aws', 'rds'],
      heroImageUrl: 'https://cdn.example/cover1.jpg',
      status: 'published',
    })
    // synthetic contentRef keeps Zod validation + static-params filters happy
    expect(articles[0].contentRef).toBe('rds://rds-article-one')
    // null excerpt/coverImage degrade safely
    expect(articles[1].description).toBe('')
    expect(articles[1].heroImageUrl).toBeUndefined()
  })

  it('queryPublishedArticles returns [] on non-ok response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: jest.fn() })
    const { queryPublishedArticles } = require('@/lib/articles/public-api-articles')
    expect(await queryPublishedArticles()).toEqual([])
  })

  it('queryPublishedArticles returns [] on network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const { queryPublishedArticles } = require('@/lib/articles/public-api-articles')
    expect(await queryPublishedArticles()).toEqual([])
  })

  it('getArticleDetailBySlug returns {metadata, content} with markdown content', async () => {
    fetchMock.mockResolvedValue(okJson(detailPayload))

    const { getArticleDetailBySlug } = require('@/lib/articles/public-api-articles')
    const detail = await getArticleDetailBySlug('rds-article-one')

    expect(fetchMock).toHaveBeenCalledWith(`${DEFAULT_BASE}/api/articles/rds-article-one`, expect.any(Object))
    expect(detail.metadata.slug).toBe('rds-article-one')
    expect(detail.metadata.model).toBe('claude-opus-4-8')
    expect(detail.content.contentType).toBe('markdown')
    expect(detail.content.content).toBe('# Hello\n\nBody text.')
    expect(detail.content.images).toEqual([])
  })

  it('getArticleDetailBySlug returns null on 404', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: jest.fn() })
    const { getArticleDetailBySlug } = require('@/lib/articles/public-api-articles')
    expect(await getArticleDetailBySlug('missing')).toBeNull()
  })

  it('getArticleMetadataBySlug returns metadata only, null on 404', async () => {
    fetchMock.mockResolvedValueOnce(okJson(detailPayload))
    const mod = require('@/lib/articles/public-api-articles')
    const meta = await mod.getArticleMetadataBySlug('rds-article-one')
    expect(meta.slug).toBe('rds-article-one')
    expect(meta.title).toBe('RDS Article One')

    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn() })
    expect(await mod.getArticleMetadataBySlug('missing')).toBeNull()
  })

  it('queryArticlesByTag filters the published list', async () => {
    fetchMock.mockResolvedValue(okJson(listPayload))
    const { queryArticlesByTag } = require('@/lib/articles/public-api-articles')
    const k8s = await queryArticlesByTag('k8s')
    expect(k8s).toHaveLength(1)
    expect(k8s[0].slug).toBe('rds-article-two')
  })

  it('honours PUBLIC_API_URL override', async () => {
    process.env.PUBLIC_API_URL = 'http://localhost:3001'
    fetchMock.mockResolvedValue(okJson(listPayload))
    const { queryPublishedArticles } = require('@/lib/articles/public-api-articles')
    await queryPublishedArticles()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/articles', expect.any(Object))
  })

  it('isArticlesApiConfigured is true (in-cluster default URL always present)', () => {
    const { isArticlesApiConfigured } = require('@/lib/articles/public-api-articles')
    expect(isArticlesApiConfigured()).toBe(true)
  })
})
