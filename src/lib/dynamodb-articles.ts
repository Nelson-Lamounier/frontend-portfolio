/**
 * DynamoDB Articles Data Layer (Server-Side Only)
 *
 * Direct DynamoDB access for Next.js server components / SSR.
 * Replaces the API Gateway fetch round-trip:
 *   ECS → VPC Gateway Endpoint → DynamoDB (free, private, fast)
 *
 * DynamoDB stores only the thin "Brain" metadata entity.
 * Article content (MDX body) is fetched from S3 via the contentRef pointer.
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
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'

import type {
  ArticleWithSlug,
  ArticleDetailResponse,
  ArticleMetadataEntity,
} from './types/article.types'
import { entityToArticle } from './types/article.types'
import { trackDynamoDBCache, trackDynamoDB } from './metrics'
import { fetchArticleContent } from './s3-content'

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
 *
 * Strategy: tries GSI1 first (efficient Query), falls back to
 * a full-table Scan filtered by sk=METADATA + status=published.
 * The Scan fallback is acceptable for portfolios with <100 articles
 * and avoids requiring the GSI to exist before testing.
 *
 * Results are cached in-memory for CACHE_TTL_MS.
 */
export async function queryPublishedArticles(): Promise<ArticleWithSlug[]> {
  const cacheKey = 'published-articles'
  const cached = cache.get<ArticleWithSlug[]>(cacheKey)
  if (cached) {
    trackDynamoDBCache('published-articles', true)
    return cached
  }
  trackDynamoDBCache('published-articles', false)

  const docClient = getDocClient()
  const start = Date.now()

  // Try GSI1 first (most efficient)
  try {
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

    trackDynamoDB('Query', 'gsi1', (Date.now() - start) / 1000)

    if (result.Items && result.Items.length > 0) {
      const articles = result.Items.map((item) =>
        entityToArticle(item as ArticleMetadataEntity),
      )
      cache.set(cacheKey, articles)
      return articles
    }
  } catch {
    // GSI doesn't exist — fall through to Scan
    // eslint-disable-next-line no-console
    console.warn('[dynamodb] GSI1 unavailable, falling back to Scan')
  }

  // Fallback: Scan with filter (works without any GSI)
  const scanStart = Date.now()
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'sk = :sk AND (#status = :status OR attribute_not_exists(#status))',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
        ':status': 'published',
      },
    }),
  )

  trackDynamoDB('Scan', 'primary', (Date.now() - scanStart) / 1000)

  if (!scanResult.Items || scanResult.Items.length === 0) {
    return []
  }

  // Sort client-side by date descending (Scan has no sort order)
  const articles = scanResult.Items
    .map((item) => entityToArticle(item as ArticleMetadataEntity))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
  if (cached !== null) {
    trackDynamoDBCache('metadata', true)
    return cached
  }
  trackDynamoDBCache('metadata', false)

  const docClient = getDocClient()
  const start = Date.now()

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `ARTICLE#${slug}`,
        sk: 'METADATA',
      },
    }),
  )

  trackDynamoDB('GetItem', 'primary', (Date.now() - start) / 1000)

  if (!result.Item) {
    return null
  }

  const article = entityToArticle(result.Item as ArticleMetadataEntity)
  cache.set(cacheKey, article)
  return article
}

/**
 * Fetch full article detail (metadata from DynamoDB + content from S3).
 *
 * Uses Promise.all for parallel fetch — metadata from DynamoDB,
 * content from S3 via the contentRef pointer on the metadata entity.
 */
export async function getArticleDetailBySlug(
  slug: string,
): Promise<ArticleDetailResponse | null> {
  // First fetch metadata to get the contentRef pointer
  const metadata = await getArticleMetadataBySlug(slug)
  if (!metadata) return null

  // Fetch content from S3 using the contentRef
  const contentRef = metadata.contentRef
  const content = contentRef
    ? await fetchArticleContent(contentRef)
    : null

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
  if (cached) {
    trackDynamoDBCache('tag', true)
    return cached
  }
  trackDynamoDBCache('tag', false)

  const docClient = getDocClient()
  const start = Date.now()

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

  trackDynamoDB('Query', 'gsi2', (Date.now() - start) / 1000)

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
