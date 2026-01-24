/**
 * Article Service - Hybrid DynamoDB/File-based Integration
 * 
 * This service provides methods for fetching articles with automatic fallback:
 * 1. Primary: API layer connected to DynamoDB
 * 2. Fallback: File-based MDX articles (during migration or when API unavailable)
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_API_URL: Base URL for the articles API
 * - ARTICLES_API_KEY: Optional API key for authentication
 * - USE_FILE_FALLBACK: Set to 'true' to enable file-based fallback (default: true)
 */

import type {
  ArticleWithSlug,
  ArticleContent,
  ArticlesListResponse,
  ArticleDetailResponse,
} from './types/article.types'

// Import file-based article functions for fallback
import { getAllArticles as getFileBasedArticles } from './articles'

// ========================================
// Configuration
// ========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const API_KEY = process.env.ARTICLES_API_KEY
const USE_FILE_FALLBACK = process.env.USE_FILE_FALLBACK !== 'false' // Default: true

/**
 * Default fetch options for ISR (Incremental Static Regeneration)
 * Revalidates every 5 minutes for published content
 */
const DEFAULT_REVALIDATE = 300

/**
 * Creates fetch options with optional authentication
 */
function createFetchOptions(revalidate: number = DEFAULT_REVALIDATE): RequestInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (API_KEY) {
    headers['x-api-key'] = API_KEY
  }
  
  return {
    headers,
    next: { revalidate },
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
 * Uses a hybrid approach:
 * 1. Attempts to fetch from DynamoDB API
 * 2. Falls back to file-based MDX articles if API unavailable
 * 
 * @param options - Pagination options
 * @returns Array of articles with metadata
 * 
 * @example
 * ```typescript
 * const articles = await getAllArticles()
 * // Returns: ArticleWithSlug[]
 * ```
 */
export async function getAllArticles(options?: {
  page?: number
  pageSize?: number
}): Promise<ArticleWithSlug[]> {
  // If no API URL configured, use file-based fallback directly
  if (!API_BASE_URL && USE_FILE_FALLBACK) {
    console.log('[ArticleService] No API URL configured, using file-based articles')
    return getFileBasedArticles()
  }
  
  const params = new URLSearchParams()
  
  if (options?.page) {
    params.set('page', options.page.toString())
  }
  if (options?.pageSize) {
    params.set('pageSize', options.pageSize.toString())
  }
  
  const queryString = params.toString()
  const url = `${API_BASE_URL}/articles${queryString ? `?${queryString}` : ''}`
  
  try {
    const response = await fetch(url, createFetchOptions())
    
    if (!response.ok) {
      throw new ArticleServiceError(
        'Failed to fetch articles',
        response.status
      )
    }
    
    const data: ArticlesListResponse = await response.json()
    return data.articles
  } catch (error) {
    // Fallback to file-based articles when API is unavailable
    if (USE_FILE_FALLBACK) {
      console.warn('[ArticleService] API unavailable, falling back to file-based articles:', error)
      return getFileBasedArticles()
    }
    
    // If fallback is disabled, throw the error
    throw error
  }
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
  const params = new URLSearchParams()
  
  if (options?.page) {
    params.set('page', options.page.toString())
  }
  if (options?.pageSize) {
    params.set('pageSize', options.pageSize.toString())
  }
  if (options?.cursor) {
    params.set('cursor', options.cursor)
  }
  
  const queryString = params.toString()
  const url = `${API_BASE_URL}/articles${queryString ? `?${queryString}` : ''}`
  
  const response = await fetch(url, createFetchOptions())
  
  if (!response.ok) {
    throw new ArticleServiceError(
      'Failed to fetch articles',
      response.status
    )
  }
  
  return response.json()
}

/**
 * Fetches a single article by slug, including full content
 * 
 * Uses a hybrid approach:
 * 1. Attempts to fetch from DynamoDB API (returns metadata + content)
 * 2. Falls back to file-based MDX (returns metadata only, content rendered separately)
 * 
 * @param slug - URL-friendly article identifier
 * @returns Article metadata and content, or null if not found
 * 
 * @example
 * ```typescript
 * const article = await getArticleBySlug('aws-devops-pro-exam')
 * if (article) {
 *   console.log(article.metadata.title)
 *   console.log(article.content.content)
 * }
 * ```
 */
export async function getArticleBySlug(
  slug: string
): Promise<ArticleDetailResponse | null> {
  // If no API URL configured, use file-based fallback
  if (!API_BASE_URL && USE_FILE_FALLBACK) {
    return getFileBasedArticleBySlug(slug)
  }
  
  const url = `${API_BASE_URL}/articles/${encodeURIComponent(slug)}`
  
  try {
    const response = await fetch(url, createFetchOptions())
    
    if (response.status === 404) {
      // Try file-based fallback for 404s (article might not be migrated yet)
      if (USE_FILE_FALLBACK) {
        console.log(`[ArticleService] Article ${slug} not in API, trying file fallback`)
        return getFileBasedArticleBySlug(slug)
      }
      return null
    }
    
    if (!response.ok) {
      throw new ArticleServiceError(
        `Failed to fetch article: ${slug}`,
        response.status,
        slug
      )
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof ArticleServiceError) {
      // For explicit API errors, try fallback
      if (USE_FILE_FALLBACK) {
        console.warn(`[ArticleService] API error for ${slug}, trying file fallback:`, error)
        return getFileBasedArticleBySlug(slug)
      }
      throw error
    }
    
    // For connection errors, try fallback
    if (USE_FILE_FALLBACK) {
      console.warn(`[ArticleService] API unavailable for ${slug}, using file fallback:`, error)
      return getFileBasedArticleBySlug(slug)
    }
    
    throw error
  }
}

/**
 * Fetches article from file-based MDX (fallback method)
 * Returns metadata and a placeholder for content (MDX will be rendered separately)
 */
async function getFileBasedArticleBySlug(
  slug: string
): Promise<ArticleDetailResponse | null> {
  try {
    const articles = await getFileBasedArticles()
    const article = articles.find((a) => a.slug === slug)
    
    if (!article) {
      return null
    }
    
    // Return metadata with a marker for file-based content
    return {
      metadata: article,
      content: {
        contentType: 'mdx',
        content: '', // Empty - MDX content rendered via file-based page
        componentData: [],
        images: [],
        version: 1,
        isFileBased: true, // Marker to indicate file-based rendering needed
      } as ArticleContent & { isFileBased: boolean },
    }
  } catch (error) {
    console.error(`[ArticleService] File fallback failed for ${slug}:`, error)
    return null
  }
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
  const url = `${API_BASE_URL}/articles/${encodeURIComponent(slug)}/metadata`
  
  const response = await fetch(url, createFetchOptions())
  
  if (response.status === 404) {
    return null
  }
  
  if (!response.ok) {
    throw new ArticleServiceError(
      `Failed to fetch article metadata: ${slug}`,
      response.status,
      slug
    )
  }
  
  return response.json()
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
  const url = `${API_BASE_URL}/articles/${encodeURIComponent(slug)}/content`
  
  const response = await fetch(url, createFetchOptions())
  
  if (response.status === 404) {
    return null
  }
  
  if (!response.ok) {
    throw new ArticleServiceError(
      `Failed to fetch article content: ${slug}`,
      response.status,
      slug
    )
  }
  
  return response.json()
}

/**
 * Fetches articles by tag
 * 
 * @param tag - Tag to filter by
 * @returns Array of articles with the specified tag
 * 
 * @example
 * ```typescript
 * const awsArticles = await getArticlesByTag('aws')
 * ```
 */
export async function getArticlesByTag(tag: string): Promise<ArticleWithSlug[]> {
  const url = `${API_BASE_URL}/articles/tag/${encodeURIComponent(tag)}`
  
  const response = await fetch(url, createFetchOptions())
  
  if (!response.ok) {
    throw new ArticleServiceError(
      `Failed to fetch articles by tag: ${tag}`,
      response.status
    )
  }
  
  const data: ArticlesListResponse = await response.json()
  return data.articles
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
  const url = `${API_BASE_URL}/articles/category/${encodeURIComponent(category)}`
  
  const response = await fetch(url, createFetchOptions())
  
  if (!response.ok) {
    throw new ArticleServiceError(
      `Failed to fetch articles by category: ${category}`,
      response.status
    )
  }
  
  const data: ArticlesListResponse = await response.json()
  return data.articles
}

/**
 * Searches articles by query string
 * Requires OpenSearch/Elasticsearch integration on backend
 * 
 * @param query - Search query
 * @returns Array of matching articles
 */
export async function searchArticles(query: string): Promise<ArticleWithSlug[]> {
  const url = `${API_BASE_URL}/articles/search?q=${encodeURIComponent(query)}`
  
  const response = await fetch(url, createFetchOptions(60)) // Shorter cache for search
  
  if (!response.ok) {
    throw new ArticleServiceError(
      `Failed to search articles: ${query}`,
      response.status
    )
  }
  
  const data: ArticlesListResponse = await response.json()
  return data.articles
}

/**
 * Gets all unique tags across all articles
 * Useful for building tag clouds or filter UIs
 * 
 * @returns Array of unique tags with article counts
 */
export async function getAllTags(): Promise<Array<{ tag: string; count: number }>> {
  const url = `${API_BASE_URL}/articles/tags`
  
  const response = await fetch(url, createFetchOptions())
  
  if (!response.ok) {
    throw new ArticleServiceError(
      'Failed to fetch tags',
      response.status
    )
  }
  
  return response.json()
}

/**
 * Gets all unique categories
 * 
 * @returns Array of unique categories with article counts
 */
export async function getAllCategories(): Promise<Array<{ category: string; count: number }>> {
  const url = `${API_BASE_URL}/articles/categories`
  
  const response = await fetch(url, createFetchOptions())
  
  if (!response.ok) {
    throw new ArticleServiceError(
      'Failed to fetch categories',
      response.status
    )
  }
  
  return response.json()
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
