/**
 * Unit tests for article-service.ts
 *
 * Tests the public-api (RDS) article serving pipeline.
 * The public-api-articles data layer is mocked — no network needed.
 */

import type { ArticleWithSlug } from '@/lib/types/article.types'

// ========================================
// Mock the public-api (RDS) data layer
// ========================================

const mockQueryPublishedArticles = jest.fn()
const mockGetArticleMetadataBySlug = jest.fn()
const mockGetArticleDetailBySlug = jest.fn()
const mockQueryArticlesByTag = jest.fn()
const mockIsArticlesApiConfigured = jest.fn()

jest.mock('@/lib/articles/public-api-articles', () => ({
  isArticlesApiConfigured: (...args: unknown[]) => mockIsArticlesApiConfigured(...args),
  queryPublishedArticles: (...args: unknown[]) => mockQueryPublishedArticles(...args),
  getArticleMetadataBySlug: (...args: unknown[]) => mockGetArticleMetadataBySlug(...args),
  getArticleDetailBySlug: (...args: unknown[]) => mockGetArticleDetailBySlug(...args),
  queryArticlesByTag: (...args: unknown[]) => mockQueryArticlesByTag(...args),
}))

// ========================================
// Mock data
// ========================================

const mockArticles: ArticleWithSlug[] = [
  {
    slug: 'rds-article-one',
    title: 'RDS Article One',
    description: 'From RDS',
    author: 'Nelson Lamounier',
    date: '2026-02-01',
    tags: ['aws', 'rds'],
    category: 'cloud',
  },
  {
    slug: 'rds-article-two',
    title: 'RDS Article Two',
    description: 'Also from RDS',
    author: 'Nelson Lamounier',
    date: '2026-01-15',
    tags: ['aws', 'k8s'],
    category: 'devops',
  },
]

// ========================================
// Tests
// ========================================

describe('ArticleService', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: API configured (in-cluster default URL always present).
    mockIsArticlesApiConfigured.mockReturnValue(true)
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('getAllArticles', () => {
    it('reads from public-api when configured', async () => {
      mockQueryPublishedArticles.mockResolvedValue(mockArticles)

      const { getAllArticles } = require('@/lib/articles/article-service')
      const articles = await getAllArticles()

      expect(mockIsArticlesApiConfigured).toHaveBeenCalled()
      expect(mockQueryPublishedArticles).toHaveBeenCalled()
      expect(articles).toEqual(mockArticles)
      expect(articles).toHaveLength(2)
      expect(articles[0].slug).toBe('rds-article-one')
    })

    it('returns empty array when the API is not configured', async () => {
      mockIsArticlesApiConfigured.mockReturnValue(false)

      const { getAllArticles } = require('@/lib/articles/article-service')
      const articles = await getAllArticles()

      expect(mockQueryPublishedArticles).not.toHaveBeenCalled()
      expect(articles).toEqual([])
    })

    it('returns empty array when the query fails', async () => {
      mockQueryPublishedArticles.mockRejectedValue(new Error('public-api unreachable'))

      const { getAllArticles } = require('@/lib/articles/article-service')
      const articles = await getAllArticles()
      expect(articles).toEqual([])
    })

    it('returns articles with required properties', async () => {
      mockQueryPublishedArticles.mockResolvedValue(mockArticles)

      const { getAllArticles } = require('@/lib/articles/article-service')
      const articles = await getAllArticles()

      articles.forEach((article: ArticleWithSlug) => {
        expect(article).toHaveProperty('slug')
        expect(article).toHaveProperty('title')
        expect(article).toHaveProperty('description')
        expect(article).toHaveProperty('author')
        expect(article).toHaveProperty('date')
      })
    })
  })

  describe('getArticleBySlug', () => {
    it('fetches article detail from public-api when configured', async () => {
      const mockDetail = {
        metadata: mockArticles[0],
        content: {
          contentType: 'markdown',
          content: '# Hello World',
          images: [],
          version: 1,
        },
      }

      mockGetArticleDetailBySlug.mockResolvedValue(mockDetail)

      const { getArticleBySlug } = require('@/lib/articles/article-service')
      const result = await getArticleBySlug('rds-article-one')

      expect(mockGetArticleDetailBySlug).toHaveBeenCalledWith('rds-article-one')
      expect(result).toEqual(mockDetail)
      expect(result?.metadata.slug).toBe('rds-article-one')
    })

    it('returns null when article not found', async () => {
      mockGetArticleDetailBySlug.mockResolvedValue(null)

      const { getArticleBySlug } = require('@/lib/articles/article-service')
      const result = await getArticleBySlug('nonexistent')

      expect(result).toBeNull()
    })

    it('returns null when the API is not configured', async () => {
      mockIsArticlesApiConfigured.mockReturnValue(false)

      const { getArticleBySlug } = require('@/lib/articles/article-service')
      const result = await getArticleBySlug('any-slug')

      expect(result).toBeNull()
      expect(mockGetArticleDetailBySlug).not.toHaveBeenCalled()
    })

    it('propagates error when the data layer fails', async () => {
      mockGetArticleDetailBySlug.mockRejectedValue(new Error('Connection refused'))

      const { getArticleBySlug } = require('@/lib/articles/article-service')

      await expect(getArticleBySlug('any-slug')).rejects.toThrow('Connection refused')
    })
  })

  describe('getArticlesByTag', () => {
    it('queries by tag when configured', async () => {
      const tagResults = [mockArticles[0]]
      mockQueryArticlesByTag.mockResolvedValue(tagResults)

      const { getArticlesByTag } = require('@/lib/articles/article-service')
      const articles = await getArticlesByTag('rds')

      expect(mockQueryArticlesByTag).toHaveBeenCalledWith('rds')
      expect(articles).toEqual(tagResults)
    })

    it('returns empty array when the API is not configured', async () => {
      mockIsArticlesApiConfigured.mockReturnValue(false)

      const { getArticlesByTag } = require('@/lib/articles/article-service')
      const articles = await getArticlesByTag('aws')

      expect(articles).toEqual([])
      expect(mockQueryArticlesByTag).not.toHaveBeenCalled()
    })
  })

  describe('getArticleMetadata', () => {
    it('fetches metadata when configured', async () => {
      mockGetArticleMetadataBySlug.mockResolvedValue(mockArticles[0])

      const { getArticleMetadata } = require('@/lib/articles/article-service')
      const metadata = await getArticleMetadata('rds-article-one')

      expect(metadata).toEqual(mockArticles[0])
    })

    it('returns null when the API is not configured', async () => {
      mockIsArticlesApiConfigured.mockReturnValue(false)

      const { getArticleMetadata } = require('@/lib/articles/article-service')
      const metadata = await getArticleMetadata('any-slug')

      expect(metadata).toBeNull()
      expect(mockGetArticleMetadataBySlug).not.toHaveBeenCalled()
    })
  })

  describe('getArticleContent', () => {
    it('returns the content from the detail response', async () => {
      mockGetArticleDetailBySlug.mockResolvedValue({
        metadata: mockArticles[0],
        content: { contentType: 'markdown', content: '# Body', images: [], version: 1 },
      })

      const { getArticleContent } = require('@/lib/articles/article-service')
      const content = await getArticleContent('rds-article-one')

      expect(content?.content).toBe('# Body')
      expect(content?.contentType).toBe('markdown')
    })

    it('returns null when the article is not found', async () => {
      mockGetArticleDetailBySlug.mockResolvedValue(null)

      const { getArticleContent } = require('@/lib/articles/article-service')
      expect(await getArticleContent('missing')).toBeNull()
    })
  })

  describe('getDataSource', () => {
    it('returns rds-public-api when configured', () => {
      const { getDataSource } = require('@/lib/articles/article-service')
      expect(getDataSource()).toBe('rds-public-api')
    })

    it('returns none when not configured', () => {
      mockIsArticlesApiConfigured.mockReturnValue(false)

      const { getDataSource } = require('@/lib/articles/article-service')
      expect(getDataSource()).toBe('none')
    })
  })

  describe('getArticlesWithPagination', () => {
    it('returns paginated results with metadata', async () => {
      mockQueryPublishedArticles.mockResolvedValue(mockArticles)

      const { getArticlesWithPagination } = require('@/lib/articles/article-service')
      const result = await getArticlesWithPagination({ page: 1, pageSize: 1 })

      expect(result.articles).toHaveLength(1)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.hasNextPage).toBe(true)
    })
  })

  describe('utility functions', () => {
    it('calculateReadingTime returns reasonable estimate', () => {
      const { calculateReadingTime } = require('@/lib/articles/article-service')
      const content = Array(400).fill('word').join(' ') // 400 words
      expect(calculateReadingTime(content)).toBe(2) // 400/200 = 2 min
    })

    it('getArticleSlugs returns slug objects', async () => {
      mockQueryPublishedArticles.mockResolvedValue(mockArticles)

      const { getArticleSlugs } = require('@/lib/articles/article-service')
      const slugs = await getArticleSlugs()

      expect(slugs).toEqual([
        { slug: 'rds-article-one' },
        { slug: 'rds-article-two' },
      ])
    })
  })
})
