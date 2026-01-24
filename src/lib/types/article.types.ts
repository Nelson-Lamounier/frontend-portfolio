/**
 * Article Types for DynamoDB Integration
 *
 * These types define the structure for articles stored in DynamoDB
 * and served via the API layer. They maintain compatibility with
 * the existing ArticleLayout and rendering components.
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
  featuredImage?: string
  status?: ArticleStatus
}

export type ArticleStatus = 'draft' | 'published' | 'archived'

// ========================================
// Article Content Types
// ========================================

export type ContentType = 'mdx' | 'markdown' | 'html'

/**
 * Article content structure from DynamoDB
 */
export interface ArticleContent {
  contentType: ContentType
  content: string
  componentData?: ComponentData[]
  images: ArticleImage[]
  version: number
  /**
   * Indicates content should be rendered from file-based MDX
   * Used during migration when article is not yet in DynamoDB
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
 * DynamoDB metadata entity structure
 */
export interface ArticleMetadataEntity {
  pk: string // "ARTICLE#<slug>"
  sk: string // "METADATA"
  entityType: 'ARTICLE_METADATA'

  slug: string
  title: string
  description: string
  author: string
  date: string

  status: ArticleStatus
  tags: string[]
  category: string
  readingTimeMinutes: number
  featuredImage?: string

  createdAt: string
  updatedAt: string
  publishedAt?: string
  version: number

  gsi1pk: string // "STATUS#<status>"
  gsi1sk: string // "<date>#<slug>"
}

/**
 * DynamoDB content entity structure
 */
export interface ArticleContentEntity {
  pk: string // "ARTICLE#<slug>"
  sk: string // "CONTENT#v<version>"
  entityType: 'ARTICLE_CONTENT'

  contentType: ContentType
  content: string
  contentS3Key?: string

  componentData?: ComponentData[]
  images: ArticleImageEntity[]

  version: number
  createdAt: string
  changelog?: string
}

/**
 * Image reference as stored in DynamoDB
 */
export interface ArticleImageEntity {
  id: string
  s3Key: string
  alt: string
  caption?: string
  width?: number
  height?: number
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
    contentSk: (version: number) => `CONTENT#v${version}`,
  }
}

/**
 * Helper to transform DynamoDB entity to API response
 */
export function entityToArticle(
  entity: ArticleMetadataEntity,
): ArticleWithSlug {
  return {
    slug: entity.slug,
    title: entity.title,
    description: entity.description,
    author: entity.author,
    date: entity.date,
    tags: entity.tags,
    category: entity.category,
    readingTimeMinutes: entity.readingTimeMinutes,
    featuredImage: entity.featuredImage,
    status: entity.status,
  }
}

/**
 * Helper to transform image entity to API response format
 */
export function entityImageToApiImage(
  entity: ArticleImageEntity,
  cloudfrontDomain: string,
): ArticleImage {
  return {
    id: entity.id,
    url: `https://${cloudfrontDomain}/${entity.s3Key}`,
    alt: entity.alt,
    caption: entity.caption,
    width: entity.width,
    height: entity.height,
  }
}
