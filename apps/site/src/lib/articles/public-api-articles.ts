/**
 * Public-API Articles Data Layer (Server-Side Only)
 *
 * The frontend is the Consumer. Articles are produced by tucaken-app +
 * the `article-pipeline` Kubernetes Job, which write to RDS Postgres
 * (`articles.content_md`). This layer READS that content through the
 * in-cluster `public-api` BFF over Kubernetes service DNS — the portfolio
 * holds no RDS credentials and makes no direct DynamoDB/S3 calls.
 *
 * Upstream contract (public-api, Hono):
 *   GET /api/articles        → { items: [{slug,title,excerpt,publishedAt,tags,coverImage}], count }
 *   GET /api/articles/:slug   → { slug,title,excerpt,contentMd,tags,aiGenerated,aiModel,
 *                                 coverImage,publishedAt,createdAt,updatedAt } | 404
 *
 * This module should NEVER be imported from client components.
 *
 * Environment Variables:
 *   PUBLIC_API_URL — in-cluster BFF base URL (default: http://public-api.public-api:3001)
 */

import type {
  ArticleWithSlug,
  ArticleContent,
  ArticleDetailResponse,
} from '../types/article.types'

// ========================================
// Configuration
// ========================================

/** In-cluster public-api BFF base URL (Kubernetes service DNS). */
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://public-api.public-api:3001'

/** ISR revalidation window (seconds) — mirrors public-api's edge cache. */
const REVALIDATE_SECONDS = 300

/**
 * The data layer always has a base URL (in-cluster default), so it is always
 * "configured". Build-time/cluster-unreachable failures are handled by the
 * graceful try/catch in the callers (return [] / null), keeping the same
 * degradation contract the DynamoDB layer had.
 */
export function isArticlesApiConfigured(): boolean {
  return true
}

// ========================================
// Upstream row shapes (public-api JSON)
// ========================================

interface PublicArticleListItem {
  slug: string
  title: string
  excerpt: string | null
  publishedAt: string | null
  tags: string[] | null
  coverImage: string | null
}

interface PublicArticleDetail extends PublicArticleListItem {
  contentMd: string
  aiGenerated: boolean
  aiModel: string | null
  createdAt: string
  updatedAt: string
}

// ========================================
// Mappers — public-api JSON → frontend types
// ========================================

/** ISO timestamp → YYYY-MM-DD, with a safe fallback. */
function toDate(iso: string | null | undefined): string {
  if (typeof iso === 'string' && iso.length >= 10) return iso.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

/**
 * Map a public-api article row to the frontend `ArticleWithSlug` shape.
 *
 * A synthetic `contentRef` (`rds://<slug>`) is supplied so the existing Zod
 * metadata schema (which requires a non-empty contentRef) and the
 * `generateStaticParams` contentRef filter keep working unchanged — the real
 * content is fetched inline from the detail endpoint, not from this pointer.
 */
function mapMetadata(row: PublicArticleListItem | PublicArticleDetail): ArticleWithSlug {
  const heroImageUrl =
    typeof row.coverImage === 'string' && row.coverImage.length > 0 ? row.coverImage : undefined
  const model =
    'aiModel' in row && typeof row.aiModel === 'string' && row.aiModel.length > 0
      ? row.aiModel
      : undefined

  return {
    slug: row.slug,
    title: row.title || row.slug,
    description: row.excerpt ?? '',
    author: 'Nelson Lamounier',
    date: toDate(row.publishedAt),
    tags: Array.isArray(row.tags) ? row.tags : [],
    category: undefined,
    heroImageUrl,
    status: 'published',
    contentRef: `rds://${row.slug}`,
    aiSummary: row.excerpt ?? undefined,
    model,
  }
}

/** Map a detail row into the {metadata, content} detail response. */
function mapDetail(row: PublicArticleDetail): ArticleDetailResponse {
  const content: ArticleContent = {
    contentType: 'markdown',
    content: row.contentMd ?? '',
    images: [],
    version: 1,
  }
  return { metadata: mapMetadata(row), content }
}

// ========================================
// Fetch helpers
// ========================================

async function getJson<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!res.ok) return { status: res.status, data: null }
  return { status: res.status, data: (await res.json()) as T }
}

// ========================================
// Public data-layer API
// ========================================

/** Fetch all published articles, newest first. Returns [] on any failure. */
export async function queryPublishedArticles(): Promise<ArticleWithSlug[]> {
  try {
    const { data } = await getJson<{ items: PublicArticleListItem[]; count: number }>('/api/articles')
    if (!data?.items) return []
    return data.items.map(mapMetadata)
  } catch (error) {
    console.error('[public-api-articles] queryPublishedArticles failed:', error)
    return []
  }
}

/** Fetch a single published article (metadata + content). Null if not found. */
export async function getArticleDetailBySlug(slug: string): Promise<ArticleDetailResponse | null> {
  const { data } = await getJson<PublicArticleDetail>(`/api/articles/${encodeURIComponent(slug)}`)
  if (!data) return null
  return mapDetail(data)
}

/** Fetch a single article's metadata only. Null if not found. */
export async function getArticleMetadataBySlug(slug: string): Promise<ArticleWithSlug | null> {
  const detail = await getArticleDetailBySlug(slug)
  return detail ? detail.metadata : null
}

/** Fetch published articles carrying a given tag (filtered client-side). */
export async function queryArticlesByTag(tag: string): Promise<ArticleWithSlug[]> {
  const articles = await queryPublishedArticles()
  const lower = tag.toLowerCase()
  return articles.filter((a) => a.tags?.some((t) => t.toLowerCase() === lower))
}
