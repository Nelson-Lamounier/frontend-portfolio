/**
 * DynamoDB Articles Data Layer (Server-Side Only)
 *
 * Direct DynamoDB access for Next.js server components / SSR.
 * Replaces the API Gateway fetch round-trip:
 *   ECS → VPC Gateway Endpoint → DynamoDB (free, private, fast)
 *
 * This module should NEVER be imported from client components.
 *
 * Environment Variables:
 *   DYNAMODB_TABLE_NAME  – required
 *   DYNAMODB_GSI1_NAME   – default: gsi1-status-date
 *   DYNAMODB_GSI2_NAME   – default: gsi2-tag-date
 *   AWS_REGION           – supplied by ECS task metadata
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

import type {
  ArticleWithSlug,
  ArticleContent,
  ArticleDetailResponse,
  ArticleMetadataEntity,
  ArticleContentEntity,
} from './types/article.types'
import { entityToArticle } from './types/article.types'

// ========================================
// Configuration
// ========================================

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || ''
const GSI1_NAME = process.env.DYNAMODB_GSI1_NAME || 'gsi1-status-date'
const GSI2_NAME = process.env.DYNAMODB_GSI2_NAME || 'gsi2-tag-date'
const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Cache TTL in milliseconds (default: 5 minutes) */
const CACHE_TTL_MS = parseInt(process.env.DYNAMODB_CACHE_TTL_MS || '300000', 10)

/**
 * Check if direct DynamoDB access is configured
 */
export function isDynamoDBConfigured(): boolean {
  return !!TABLE_NAME
}

// ========================================
// In-Memory TTL Cache
// ========================================

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/**
 * Lightweight in-memory cache with TTL eviction.
 * Designed for low-write content (articles) where stale reads
 * are acceptable for the TTL window.
 *
 * Why not DAX: DAX costs ~$0.04/hr even at idle. For a solo-dev
 * portfolio with <100 articles, in-process cache is free.
 */
class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

const cache = new TTLCache()

// ========================================
// DynamoDB Client (singleton, lazy init)
// ========================================

let _docClient: DynamoDBDocumentClient | null = null

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const client = new DynamoDBClient({ region: REGION })
    _docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    })
  }
  return _docClient
}

// ========================================
// Query Functions
// ========================================

/**
 * Fetch all published articles, sorted by date descending.
 * Uses GSI1: pk=STATUS#published, sk=date#slug (ScanIndexForward=false)
 * Results are cached in-memory for CACHE_TTL_MS.
 */
export async function queryPublishedArticles(): Promise<ArticleWithSlug[]> {
  const cacheKey = 'published-articles'
  const cached = cache.get<ArticleWithSlug[]>(cacheKey)
  if (cached) return cached

  const docClient = getDocClient()

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'STATUS#published',
      },
      ScanIndexForward: false, // newest first
    }),
  )

  if (!result.Items || result.Items.length === 0) {
    return []
  }

  const articles = result.Items.map((item) =>
    entityToArticle(item as ArticleMetadataEntity),
  )
  cache.set(cacheKey, articles)
  return articles
}

/**
 * Fetch a single article's metadata by slug.
 * Direct GetItem: pk=ARTICLE#<slug>, sk=METADATA
 * Results are cached per-slug.
 */
export async function getArticleMetadataBySlug(
  slug: string,
): Promise<ArticleWithSlug | null> {
  const cacheKey = `metadata:${slug}`
  const cached = cache.get<ArticleWithSlug | null>(cacheKey)
  if (cached !== null) return cached

  const docClient = getDocClient()

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `ARTICLE#${slug}`,
        sk: 'METADATA',
      },
    }),
  )

  if (!result.Item) {
    return null
  }

  const article = entityToArticle(result.Item as ArticleMetadataEntity)
  cache.set(cacheKey, article)
  return article
}

/**
 * Fetch a single article's content by slug.
 * Direct GetItem: pk=ARTICLE#<slug>, sk=CONTENT#v1
 */
export async function getArticleContentBySlug(
  slug: string,
  version: number = 1,
): Promise<ArticleContent | null> {
  const docClient = getDocClient()

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `ARTICLE#${slug}`,
        sk: `CONTENT#v${version}`,
      },
    }),
  )

  if (!result.Item) {
    return null
  }

  const entity = result.Item as ArticleContentEntity
  return {
    contentType: entity.contentType,
    content: entity.content,
    componentData: entity.componentData,
    images: entity.images?.map((img) => ({
      id: img.id,
      url: img.s3Key, // caller maps to CloudFront URL if needed
      alt: img.alt,
      caption: img.caption,
      width: img.width,
      height: img.height,
    })) || [],
    version: entity.version,
  }
}

/**
 * Fetch full article detail (metadata + content) by slug.
 */
export async function getArticleDetailBySlug(
  slug: string,
): Promise<ArticleDetailResponse | null> {
  const metadata = await getArticleMetadataBySlug(slug)
  if (!metadata) return null

  const content = await getArticleContentBySlug(slug)

  return {
    metadata,
    content: content || {
      contentType: 'mdx',
      content: '',
      images: [],
      version: 1,
      isFileBased: true,
    },
  }
}

/**
 * Fetch articles by tag using GSI2.
 * pk=TAG#<tag>, sk=date#slug (ScanIndexForward=false for newest first)
 *
 * Note: TAG_INDEX items have denormalized article data, so we can
 * reconstruct ArticleWithSlug without a second query.
 */
export async function queryArticlesByTag(
  tag: string,
): Promise<ArticleWithSlug[]> {
  const normalizedTag = tag.toLowerCase()
  const cacheKey = `tag:${normalizedTag}`
  const cached = cache.get<ArticleWithSlug[]>(cacheKey)
  if (cached) return cached

  const docClient = getDocClient()

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI2_NAME,
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `TAG#${normalizedTag}`,
      },
      ScanIndexForward: false,
    }),
  )

  if (!result.Items || result.Items.length === 0) {
    return []
  }

  // TAG_INDEX items have denormalized article fields
  const articles = result.Items.map((item) => ({
    slug: item.articleSlug as string,
    title: item.articleTitle as string,
    description: (item.articleDescription as string) || '',
    author: (item.articleAuthor as string) || '',
    date: item.articleDate as string,
    tags: (item.articleTags as string[]) || [item.tag as string],
    readingTimeMinutes: item.articleReadingTime as number | undefined,
  }))
  cache.set(cacheKey, articles)
  return articles
}
