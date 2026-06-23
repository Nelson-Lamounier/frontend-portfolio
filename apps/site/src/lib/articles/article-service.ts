/**
 * Article Service — public-api (RDS) Integration
 *
 * The frontend is the Consumer in the Producer-Consumer architecture.
 * Articles are produced by tucaken-app + the `article-pipeline` Kubernetes
 * Job, which write metadata and Markdown body to RDS Postgres
 * (`articles.content_md`). This service only queries — it never generates
 * article files.
 *
 * Data source: in-cluster `public-api` BFF (Kubernetes service DNS) backed by
 * RDS. The portfolio holds no RDS credentials and makes no direct
 * DynamoDB/S3 calls.
 *
 * Observability:
 * - Structured JSON logs (AIOps-ready for CloudWatch / LLM auto-diagnosis)
 * - Custom OpenTelemetry spans for business-level tracing in X-Ray
 *
 * Environment Variables (server-side):
 * - PUBLIC_API_URL: in-cluster BFF base URL (default: http://public-api.public-api:3001)
 *
 * Environment Variables (client-side, kept for browser API calls):
 * - NEXT_PUBLIC_API_URL: Base URL for the articles API (used by client components)
 */

import { trace, SpanStatusCode } from '@opentelemetry/api'

import type {
  ArticleWithSlug,
  ArticleContent,
  ArticlesListResponse,
  ArticleDetailResponse,
} from '../types/article.types'

// Import the public-api (RDS-backed) data layer
import {
  isArticlesApiConfigured,
  queryPublishedArticles,
  getArticleMetadataBySlug,
  getArticleDetailBySlug,
  queryArticlesByTag,
} from './public-api-articles'

// Import Zod validation for runtime SEO safety
import { safeValidateMetadata, type ValidatedArticleMetadata } from '../types/content-schemas'

// Import Prometheus metrics helpers
import { trackArticleRequest } from '../observability/metrics'

/** Data-source label used in logs, spans, and metrics. */
const SOURCE = 'rds-public-api'

// ========================================
// OpenTelemetry Tracer (business-level spans)
// ========================================

const tracer = trace.getTracer('article-service', '1.0.0')

// ========================================
// Structured Logger (AIOps-ready)
// ========================================

interface LogEntry {
  service: string
  operation: string
  source?: string
  count?: number
  slug?: string
  tag?: string
  latencyMs?: number
  error?: string
  level: 'info' | 'warn' | 'error'
  [key: string]: unknown
}

function slog(entry: LogEntry): void {
  const output = { timestamp: new Date().toISOString(), ...entry }
  switch (entry.level) {
    case 'error':
      console.error(JSON.stringify(output))
      break
    case 'warn':
      console.warn(JSON.stringify(output))
      break
    default:
      console.log(JSON.stringify(output))
  }
}

// ========================================
// Error Handling
// ========================================

export class ArticleServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public slug?: string
  ) {
    super(message)
    this.name = 'ArticleServiceError'
  }
}

// ========================================
// Public API Methods
// ========================================

/**
 * Fetches all published articles, sorted by date (newest first)
 *
 * Source: in-cluster public-api BFF (RDS).
 * Returns empty array when the API is unreachable (e.g. during build).
 *
 * @param options - Pagination options
 * @returns Array of articles with metadata
 */
export async function getAllArticles(_options?: {
  page?: number
  pageSize?: number
}): Promise<ArticleWithSlug[]> {
  return tracer.startActiveSpan('ArticleService.getAllArticles', async (span) => {
    const start = Date.now()
    try {
      if (!isArticlesApiConfigured()) {
        slog({ service: 'article-service', operation: 'getAllArticles', source: 'none', level: 'warn' })
        span.setAttributes({ 'article.source': 'none', 'article.count': 0 })
        return []
      }

      const articles = await queryPublishedArticles()
      span.setAttributes({ 'article.source': SOURCE, 'article.count': articles.length })
      slog({ service: 'article-service', operation: 'getAllArticles', source: SOURCE, count: articles.length, latencyMs: Date.now() - start, level: 'info' })
      trackArticleRequest('getAllArticles', SOURCE, 'success', (Date.now() - start) / 1000)
      return articles
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      span.setAttributes({ 'article.source': SOURCE, 'article.error': errMsg })
      span.setStatus({ code: SpanStatusCode.ERROR, message: errMsg })
      slog({ service: 'article-service', operation: 'getAllArticles', source: SOURCE, error: errMsg, latencyMs: Date.now() - start, level: 'error' })
      trackArticleRequest('getAllArticles', SOURCE, 'error', (Date.now() - start) / 1000)
      // Return empty array instead of throwing so Next.js prerender/ISR
      // succeeds at Docker build time (public-api unreachable) — ISR fetches
      // real data at runtime once the pod can reach the in-cluster BFF.
      return []
    } finally {
      span.end()
    }
  })
}

/**
 * Fetches all published articles with pagination metadata
 *
 * @param options - Pagination options
 * @returns Articles list with pagination info
 */
export async function getArticlesWithPagination(options?: {
  page?: number
  pageSize?: number
  cursor?: string
}): Promise<ArticlesListResponse> {
  const articles = await getAllArticles()

  const page = options?.page || 1
  const pageSize = options?.pageSize || articles.length
  const start = (page - 1) * pageSize
  const paginatedArticles = articles.slice(start, start + pageSize)

  return {
    articles: paginatedArticles,
    pagination: {
      total: articles.length,
      page,
      pageSize,
      hasNextPage: start + pageSize < articles.length,
    },
  }
}

/**
 * Fetches a single article by slug, including full content
 *
 * Source: in-cluster public-api BFF (RDS) — metadata + Markdown body inline.
 * Returns null when the API is not configured or the article is not found.
 *
 * @param slug - URL-friendly article identifier
 * @returns Article metadata and content, or null if not found
 */
export async function getArticleBySlug(
  slug: string
): Promise<ArticleDetailResponse | null> {
  return tracer.startActiveSpan('ArticleService.getArticleBySlug', async (span) => {
    const start = Date.now()
    span.setAttribute('article.slug', slug)
    try {
      if (!isArticlesApiConfigured()) {
        return null
      }

      const detail = await getArticleDetailBySlug(slug)
      if (detail) {
        span.setAttribute('article.source', SOURCE)
        slog({ service: 'article-service', operation: 'getArticleBySlug', source: SOURCE, slug, latencyMs: Date.now() - start, level: 'info' })
        return detail
      }

      slog({ service: 'article-service', operation: 'getArticleBySlug', slug, level: 'info', found: false })
      return null
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      span.setAttributes({ 'article.source': SOURCE, 'article.error': errMsg })
      slog({ service: 'article-service', operation: 'getArticleBySlug', source: SOURCE, slug, error: errMsg, latencyMs: Date.now() - start, level: 'error' })
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Fetches article metadata only (without content)
 * Useful for list pages and SEO metadata generation
 *
 * @param slug - URL-friendly article identifier
 * @returns Article metadata, or null if not found
 */
export async function getArticleMetadata(
  slug: string
): Promise<ArticleWithSlug | null> {
  return tracer.startActiveSpan('ArticleService.getArticleMetadata', async (span) => {
    span.setAttribute('article.slug', slug)
    try {
      if (!isArticlesApiConfigured()) {
        return null
      }

      const metadata = await getArticleMetadataBySlug(slug)
      if (metadata) {
        span.setAttribute('article.source', SOURCE)
        return metadata
      }

      return null
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      slog({ service: 'article-service', operation: 'getArticleMetadata', source: SOURCE, slug, error: errMsg, level: 'error' })
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Fetches article content only
 * Useful when metadata is already cached
 *
 * @param slug - URL-friendly article identifier
 * @returns Article content, or null if not found
 */
export async function getArticleContent(
  slug: string
): Promise<ArticleContent | null> {
  if (!isArticlesApiConfigured()) return null

  try {
    const detail = await getArticleDetailBySlug(slug)
    return detail ? detail.content : null
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    slog({ service: 'article-service', operation: 'getArticleContent', source: SOURCE, slug, error: errMsg, level: 'error' })
    return null
  }
}

/**
 * Fetch and Zod-validate article metadata for SEO generation.
 * Returns null (with warning) if metadata fails validation.
 *
 * @param slug - URL-friendly article identifier
 * @returns Validated metadata safe for generateMetadata() and JSON-LD
 */
export async function getValidatedMetadata(
  slug: string,
): Promise<ValidatedArticleMetadata | null> {
  if (!isArticlesApiConfigured()) return null

  try {
    const raw = await getArticleMetadataBySlug(slug)
    if (!raw) return null

    const result = safeValidateMetadata(raw)
    if (!result.success) {
      slog({
        service: 'article-service',
        operation: 'getValidatedMetadata',
        slug,
        error: JSON.stringify(result.error.issues),
        level: 'warn',
      })
      return null
    }

    return result.data
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    slog({
      service: 'article-service',
      operation: 'getValidatedMetadata',
      slug,
      error: errMsg,
      level: 'error',
    })
    return null
  }
}

/**
 * Fetches articles by tag
 *
 * @param tag - Tag to filter by
 * @returns Array of articles with the specified tag
 */
export async function getArticlesByTag(tag: string): Promise<ArticleWithSlug[]> {
  return tracer.startActiveSpan('ArticleService.getArticlesByTag', async (span) => {
    const start = Date.now()
    span.setAttribute('article.tag', tag)
    try {
      if (!isArticlesApiConfigured()) {
        return []
      }

      const articles = await queryArticlesByTag(tag)
      span.setAttributes({ 'article.source': SOURCE, 'article.count': articles.length })
      slog({ service: 'article-service', operation: 'getArticlesByTag', source: SOURCE, tag, count: articles.length, latencyMs: Date.now() - start, level: 'info' })
      return articles
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      slog({ service: 'article-service', operation: 'getArticlesByTag', source: SOURCE, tag, error: errMsg, latencyMs: Date.now() - start, level: 'error' })
      return []
    } finally {
      span.end()
    }
  })
}

/**
 * Fetches articles by category
 *
 * @param category - Category to filter by
 * @returns Array of articles in the specified category
 */
export async function getArticlesByCategory(
  category: string
): Promise<ArticleWithSlug[]> {
  // Use getAllArticles and filter by category
  const articles = await getAllArticles()
  return articles.filter(
    (a) => a.category?.toLowerCase() === category.toLowerCase()
  )
}

/**
 * Searches articles by query string (basic title/description search)
 *
 * @param query - Search query
 * @returns Array of matching articles
 */
export async function searchArticles(query: string): Promise<ArticleWithSlug[]> {
  // Simple client-side search over all articles
  const articles = await getAllArticles()
  const lowerQuery = query.toLowerCase()
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Gets all unique tags across all articles
 * Useful for building tag clouds or filter UIs
 *
 * @returns Array of unique tags with article counts
 */
export async function getAllTags(): Promise<Array<{ tag: string; count: number }>> {
  const articles = await getAllArticles()
  const tagMap = new Map<string, number>()

  for (const article of articles) {
    if (article.tags) {
      for (const tag of article.tags) {
        const lower = tag.toLowerCase()
        tagMap.set(lower, (tagMap.get(lower) || 0) + 1)
      }
    }
  }

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Gets all unique categories
 *
 * @returns Array of unique categories with article counts
 */
export async function getAllCategories(): Promise<Array<{ category: string; count: number }>> {
  const articles = await getAllArticles()
  const catMap = new Map<string, number>()

  for (const article of articles) {
    if (article.category) {
      catMap.set(article.category, (catMap.get(article.category) || 0) + 1)
    }
  }

  return Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

// ========================================
// Utility Functions
// ========================================

/**
 * Generates static paths for all articles
 * Used in generateStaticParams for Next.js SSG
 *
 * @returns Array of slug objects for static generation
 */
export async function getArticleSlugs(): Promise<Array<{ slug: string }>> {
  const articles = await getAllArticles()
  return articles.map((article) => ({ slug: article.slug }))
}

/**
 * Prefetches article data for optimistic loading
 * Useful for link hover prefetching
 *
 * @param slug - Article slug to prefetch
 */
export function prefetchArticle(slug: string): void {
  // Trigger fetch without awaiting - browser will cache the response
  getArticleBySlug(slug).catch(() => {
    // Silently fail - this is just for optimization
  })
}

/**
 * Calculates reading time from content length
 * Average reading speed: 200 words per minute
 *
 * @param content - Article content string
 * @returns Estimated reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Returns the current data source being used
 * Useful for observability and debugging
 */
export function getDataSource(): 'rds-public-api' | 'none' {
  if (isArticlesApiConfigured()) return SOURCE
  return 'none'
}
