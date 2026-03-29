/**
 * Article Types for DynamoDB + S3 Integration
 *
 * DynamoDB stores only the lightweight "Brain" metadata entity.
 * Article content (MDX body, componentData, images) lives in S3.
 *
 * These types maintain compatibility with the existing ArticleLayout
 * and rendering components.
 */

// ========================================
// Core Article Types
// ========================================

/**
 * Base article metadata - matches existing Article interface
 */
export interface Article {
  title: string
  description: string
  author: string
  date: string
}

/**
 * Extended article with URL slug and optional metadata
 */
export interface ArticleWithSlug extends Article {
  slug: string
  tags?: string[]
  category?: string
  readingTimeMinutes?: number
  heroImageUrl?: string
  githubUrl?: string
  status?: ArticleStatus
  contentRef?: string
  aiSummary?: string
}

export type ArticleStatus =
  | 'draft'
  | 'processing'
  | 'review'
  | 'published'
  | 'rejected'
  | 'archived'

// ========================================
// Article Content Types (from S3)
// ========================================

export type ContentType = 'mdx' | 'markdown' | 'html'

/**
 * Article content structure — fetched from S3, NOT DynamoDB.
 * The MDX body, componentData, and images all live in the S3 blob.
 */
export interface ArticleContent {
  contentType: ContentType
  content: string
  componentData?: ComponentData[]
  images: ArticleImage[]
  version: number
  /**
   * Indicates content should be rendered from file-based MDX
   * Used during migration when article is not yet in S3/DynamoDB
   */
  isFileBased?: boolean
}

/**
 * Custom component data embedded in articles
 * Supports ScenarioKeywords and EliminationList components
 */
export interface ComponentData {
  componentId: string
  componentType: ComponentType
  position: number
  props: Record<string, unknown>
}

export type ComponentType = 'ScenarioKeywords' | 'EliminationList'

/**
 * Image reference with S3/CloudFront URL
 */
export interface ArticleImage {
  id: string
  url: string
  alt: string
  caption?: string
  width?: number
  height?: number
}

// ========================================
// API Response Types
// ========================================

/**
 * Response from GET /api/articles
 */
export interface ArticlesListResponse {
  articles: ArticleWithSlug[]
  pagination: PaginationInfo
}

/**
 * Response from GET /api/articles/:slug
 */
export interface ArticleDetailResponse {
  metadata: ArticleWithSlug
  content: ArticleContent
}

/**
 * Pagination metadata for list endpoints
 */
export interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  hasNextPage: boolean
  nextCursor?: string
}

// ========================================
// DynamoDB Entity Types
// ========================================

/**
 * DynamoDB "Brain" metadata entity — thin, queryable index.
 *
 * Heavy data (content body, componentData, images) lives in S3.
 * This entity stores only fields needed for listing, searching,
 * and the S3 content pointer.
 */
export interface ArticleMetadataEntity {
  pk: string // "ARTICLE#<slug>"
  sk: string // "METADATA"
  entityType: 'ARTICLE_METADATA'

  // Core queryable fields
  slug: string
  title: string
  description: string
  author: string
  date: string

  status: ArticleStatus
  tags: string[]
  category: string
  readingTimeMinutes: number
  heroImageUrl?: string

  // S3 Content Pointer
  contentRef: string       // "s3://<bucket>/published/<slug>.mdx"
  contentType: ContentType

  // AI-Generated Summary (populated by Bedrock pipeline)
  aiSummary?: string

  // GitHub repository URL (optional, set by Bedrock or admin)
  githubUrl?: string

  // Timestamps
  createdAt: string
  updatedAt: string
  publishedAt?: string
  version: number

  // GSI Keys
  gsi1pk: string // "STATUS#<status>"
  gsi1sk: string // "<date>#<slug>"
}

// ========================================
// Component Props Types (for custom components)
// ========================================

/**
 * Props for ScenarioKeywords component
 */
export interface ScenarioKeywordsProps {
  keywords: Array<{
    keyword: string
    solution: string
  }>
}

/**
 * Props for EliminationList component
 */
export interface EliminationListProps {
  items: Array<{
    text: string
    isCorrect: boolean
    reason?: string
  }>
}

// ========================================
// Utility Types
// ========================================

/**
 * Helper type for creating DynamoDB keys
 */
export function createArticleKey(slug: string) {
  return {
    pk: `ARTICLE#${slug}`,
    metadataSk: 'METADATA',
  }
}

/**
 * Helper to transform DynamoDB entity to API response.
 *
 * Resilient to minimal records from the Bedrock Lambda which writes:
 *   { pk, sk, title, tags, aiSummary, readingTime, contentRef, shotListCount, heroImageUrl }
 * but the frontend expects:
 *   { slug, title, description, author, date, tags, category, readingTimeMinutes, ... }
 *
 * This mapper bridges the gap by extracting slug from pk, mapping
 * readingTime → readingTimeMinutes, and providing sensible defaults.
 */
export function entityToArticle(
  entity: ArticleMetadataEntity | Record<string, unknown>,
): ArticleWithSlug {
  const e = entity as Record<string, unknown>

  // Slug: prefer explicit field, fall back to extracting from pk  (ARTICLE#<slug>)
  const slug =
    (e.slug as string) ||
    (typeof e.pk === 'string' ? e.pk.replace(/^ARTICLE#/, '') : '')

  // Description: prefer explicit, fall back to aiSummary
  const description =
    (e.description as string) ||
    (e.aiSummary as string) ||
    ''

  // Date: prefer date, fall back to publishedAt, createdAt, or gsi1sk prefix
  const date =
    (e.date as string) ||
    (e.publishedAt as string)?.slice(0, 10) ||
    (e.createdAt as string)?.slice(0, 10) ||
    (typeof e.gsi1sk === 'string' ? e.gsi1sk.split('#')[0] : '') ||
    new Date().toISOString().slice(0, 10)

  // readingTimeMinutes: prefer explicit, fall back to readingTime (Lambda field name)
  const readingTimeMinutes =
    (e.readingTimeMinutes as number) ??
    (typeof e.readingTime === 'number' ? e.readingTime : undefined)

  // heroImageUrl: only pass through if it's a valid non-empty URL
  const heroImageUrl =
    typeof e.heroImageUrl === 'string' && e.heroImageUrl.length > 0
      ? e.heroImageUrl
      : undefined

  // githubUrl: only pass through if it's a valid non-empty string
  const githubUrl =
    typeof e.githubUrl === 'string' && e.githubUrl.length > 0
      ? e.githubUrl
      : undefined

  return {
    slug,
    title: (e.title as string) || slug,
    description,
    author: (e.author as string) || 'Nelson Lamounier',
    date,
    tags: Array.isArray(e.tags) ? (e.tags as string[]) : [],
    category: (e.category as string) || undefined,
    readingTimeMinutes,
    heroImageUrl,
    githubUrl,
    status: (e.status as ArticleStatus) || 'published',
    contentRef: (e.contentRef as string) || '',
    aiSummary: (e.aiSummary as string) || undefined,
  }
}
