/**
 * Unit tests for article-service.ts
 *
 * Tests the DynamoDB-only article serving pipeline.
 * DynamoDB and S3 calls are mocked — no real AWS credentials needed.
 */

import type { ArticleWithSlug } from '@/lib/types/article.types'

// ========================================
// Mock DynamoDB data layer
// ========================================

const mockQueryPublishedArticles = jest.fn()
const mockGetArticleMetadataBySlug = jest.fn()
const mockGetArticleDetailBySlug = jest.fn()
const mockQueryArticlesByTag = jest.fn()
const mockIsDynamoDBConfigured = jest.fn()

jest.mock('@/lib/dynamodb-articles', () => ({
  isDynamoDBConfigured: (...args: unknown[]) => mockIsDynamoDBConfigured(...args),
  queryPublishedArticles: (...args: unknown[]) => mockQueryPublishedArticles(...args),
  getArticleMetadataBySlug: (...args: unknown[]) => mockGetArticleMetadataBySlug(...args),
  getArticleDetailBySlug: (...args: unknown[]) => mockGetArticleDetailBySlug(...args),
  queryArticlesByTag: (...args: unknown[]) => mockQueryArticlesByTag(...args),
}))

// ========================================
// Mock S3 content layer
// ========================================

const mockFetchArticleContent = jest.fn()
const mockBuildContentRef = jest.fn((slug: string) => `published/${slug}.mdx`)

jest.mock('@/lib/s3-content', () => ({
  fetchArticleContent: (contentRef: string) => mockFetchArticleContent(contentRef),
  buildContentRef: (slug: string) => mockBuildContentRef(slug),
}))

// ========================================
// DynamoDB mock data
// ========================================

const mockDynamoArticles: ArticleWithSlug[] = [
  {
    slug: 'dynamo-article-one',
    title: 'DynamoDB Article One',
    description: 'From DynamoDB',
    author: 'Test Author',
    date: '2025-02-01',
    tags: ['aws', 'dynamodb'],
    category: 'cloud',
  },
  {
    slug: 'dynamo-article-two',
    title: 'DynamoDB Article Two',
    description: 'Also from DynamoDB',
    author: 'Test Author',
    date: '2025-01-15',
    tags: ['aws', 'ecs'],
    category: 'devops',
  },
]

// ========================================
// Tests
// ========================================

describe('ArticleService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllArticles', () => {
    it('uses DynamoDB SDK when configured', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockQueryPublishedArticles.mockResolvedValue(mockDynamoArticles)

      const { getAllArticles } = require('@/lib/article-service')
      const articles = await getAllArticles()

      expect(mockIsDynamoDBConfigured).toHaveBeenCalled()
      expect(mockQueryPublishedArticles).toHaveBeenCalled()
      expect(articles).toEqual(mockDynamoArticles)
      expect(articles).toHaveLength(2)
      expect(articles[0].slug).toBe('dynamo-article-one')
    })

    it('returns empty array when DynamoDB is not configured', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(false)

      const { getAllArticles } = require('@/lib/article-service')
      const articles = await getAllArticles()

      expect(mockQueryPublishedArticles).not.toHaveBeenCalled()
      expect(articles).toEqual([])
      expect(articles).toHaveLength(0)
    })

    it('propagates error when DynamoDB query fails', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockQueryPublishedArticles.mockRejectedValue(new Error('DynamoDB unreachable'))

      const { getAllArticles } = require('@/lib/article-service')

      await expect(getAllArticles()).rejects.toThrow('DynamoDB unreachable')
    })

    it('returns articles with required properties', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockQueryPublishedArticles.mockResolvedValue(mockDynamoArticles)

      const { getAllArticles } = require('@/lib/article-service')
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
    it('fetches article detail from DynamoDB when configured', async () => {
      const mockDetail = {
        metadata: mockDynamoArticles[0],
        content: {
          contentType: 'mdx',
          content: '# Hello World',
          images: [],
          version: 1,
        },
      }

      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockGetArticleDetailBySlug.mockResolvedValue(mockDetail)

      const { getArticleBySlug } = require('@/lib/article-service')
      const result = await getArticleBySlug('dynamo-article-one')

      expect(mockGetArticleDetailBySlug).toHaveBeenCalledWith('dynamo-article-one')
      expect(result).toEqual(mockDetail)
      expect(result?.metadata.slug).toBe('dynamo-article-one')
    })

    it('returns null when article not found in DynamoDB', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockGetArticleDetailBySlug.mockResolvedValue(null)

      const { getArticleBySlug } = require('@/lib/article-service')
      const result = await getArticleBySlug('nonexistent')

      expect(result).toBeNull()
    })

    it('returns null when DynamoDB is not configured', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(false)

      const { getArticleBySlug } = require('@/lib/article-service')
      const result = await getArticleBySlug('any-slug')

      expect(result).toBeNull()
      expect(mockGetArticleDetailBySlug).not.toHaveBeenCalled()
    })

    it('propagates error when DynamoDB fails', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockGetArticleDetailBySlug.mockRejectedValue(new Error('Connection refused'))

      const { getArticleBySlug } = require('@/lib/article-service')

      await expect(getArticleBySlug('any-slug')).rejects.toThrow('Connection refused')
    })
  })

  describe('getArticlesByTag', () => {
    it('uses GSI2 query when DynamoDB is configured', async () => {
      const tagResults = [mockDynamoArticles[0]]
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockQueryArticlesByTag.mockResolvedValue(tagResults)

      const { getArticlesByTag } = require('@/lib/article-service')
      const articles = await getArticlesByTag('dynamodb')

      expect(mockQueryArticlesByTag).toHaveBeenCalledWith('dynamodb')
      expect(articles).toEqual(tagResults)
    })

    it('returns empty array when DynamoDB is not configured', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(false)

      const { getArticlesByTag } = require('@/lib/article-service')
      const articles = await getArticlesByTag('aws')

      expect(articles).toEqual([])
      expect(mockQueryArticlesByTag).not.toHaveBeenCalled()
    })
  })

  describe('getArticleMetadata', () => {
    it('fetches metadata from DynamoDB when configured', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockGetArticleMetadataBySlug.mockResolvedValue(mockDynamoArticles[0])

      const { getArticleMetadata } = require('@/lib/article-service')
      const metadata = await getArticleMetadata('dynamo-article-one')

      expect(metadata).toEqual(mockDynamoArticles[0])
    })

    it('returns null when DynamoDB is not configured', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(false)

      const { getArticleMetadata } = require('@/lib/article-service')
      const metadata = await getArticleMetadata('any-slug')

      expect(metadata).toBeNull()
      expect(mockGetArticleMetadataBySlug).not.toHaveBeenCalled()
    })
  })

  describe('getDataSource', () => {
    it('returns dynamodb-sdk when configured', () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)

      const { getDataSource } = require('@/lib/article-service')
      expect(getDataSource()).toBe('dynamodb-sdk')
    })

    it('returns none when DynamoDB is not configured', () => {
      mockIsDynamoDBConfigured.mockReturnValue(false)

      const { getDataSource } = require('@/lib/article-service')
      expect(getDataSource()).toBe('none')
    })
  })

  describe('getArticlesWithPagination', () => {
    it('returns paginated results with metadata', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockQueryPublishedArticles.mockResolvedValue(mockDynamoArticles)

      const { getArticlesWithPagination } = require('@/lib/article-service')
      const result = await getArticlesWithPagination({ page: 1, pageSize: 1 })

      expect(result.articles).toHaveLength(1)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.hasNextPage).toBe(true)
    })
  })

  describe('utility functions', () => {
    it('calculateReadingTime returns reasonable estimate', () => {
      const { calculateReadingTime } = require('@/lib/article-service')
      const content = Array(400).fill('word').join(' ') // 400 words
      expect(calculateReadingTime(content)).toBe(2) // 400/200 = 2 min
    })

    it('getArticleSlugs returns slug objects', async () => {
      mockIsDynamoDBConfigured.mockReturnValue(true)
      mockQueryPublishedArticles.mockResolvedValue(mockDynamoArticles)

      const { getArticleSlugs } = require('@/lib/article-service')
      const slugs = await getArticleSlugs()

      expect(slugs).toEqual([
        { slug: 'dynamo-article-one' },
        { slug: 'dynamo-article-two' },
      ])
    })
  })
})
