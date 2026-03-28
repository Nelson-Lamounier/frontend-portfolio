/**
 * Dynamic Article Page — [slug] Route
 *
 * Parallel rendering path for S3-hosted articles. Fetches metadata
 * from DynamoDB and content from S3, renders MDX with full component
 * library, and injects JSON-LD structured data for SEO.
 *
 * Existing file-based page.mdx routes take priority over this dynamic
 * route (Next.js behavior), so the 7 current articles are unaffected.
 *
 * Route: /articles/:slug
 * Revalidation: ISR with 1-hour TTL
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ArticleLayout } from '@/components/articles'
import { MDXRenderer } from '@/components/articles'
import {
  generateArticleJsonLd,
  generateArticleMetadata,
} from '@/lib/articles/article-structured-data'
import { fetchArticleContent } from '@/lib/articles/s3-content'
import {
  getArticleMetadataBySlug,
  isDynamoDBConfigured,
} from '@/lib/articles/dynamodb-articles'
import {
  safeValidateMetadata,
  type ValidatedArticleMetadata,
} from '@/lib/types/content-schemas'

// ========================================
// ISR Configuration
// ========================================

export const revalidate = 3600 // Revalidate every hour

// ========================================
// Static Params — Pre-render published articles
// ========================================

/**
 * Generate static params for all published articles with S3 content.
 * Falls back to empty array if DynamoDB is not configured (build time).
 */
export async function generateStaticParams() {
  if (!isDynamoDBConfigured()) {
    return []
  }

  // Import here to avoid circular dependency at build time
  const { queryPublishedArticles } = await import('@/lib/articles/dynamodb-articles')

  try {
    const articles = await queryPublishedArticles()
    return articles
      .filter((a) => a.contentRef) // Only S3-hosted articles
      .map((a) => ({ slug: a.slug }))
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[slug/page] Failed to generate static params, using empty')
    return []
  }
}

// ========================================
// Metadata Generation
// ========================================

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params

  const metadata = await fetchValidatedMetadata(slug)
  if (!metadata) return {}

  return generateArticleMetadata(metadata)
}

// ========================================
// Page Component
// ========================================

export default async function DynamicArticlePage({
  params,
}: PageProps) {
  const { slug } = await params

  // 1. Fetch + validate metadata from DynamoDB
  const metadata = await fetchValidatedMetadata(slug)
  if (!metadata) notFound()

  // 2. Fetch content from S3
  if (!metadata.contentRef) notFound()
  const content = await fetchArticleContent(metadata.contentRef)
  if (!content) notFound()

  // 3. Generate JSON-LD structured data
  const jsonLd = generateArticleJsonLd(metadata)

  // 4. Build the article object for ArticleLayout
  const article = {
    slug: metadata.slug,
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    date: metadata.date,
    tags: metadata.tags,
    heroImageUrl: metadata.heroImageUrl,
    aiSummary: metadata.aiSummary,
    githubUrl: metadata.githubUrl,
  }

  return (
    <>
      {/* JSON-LD for search engines and AI agents */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ArticleLayout article={article}>
        <MDXRenderer source={content.content} />
      </ArticleLayout>
    </>
  )
}

// ========================================
// Internal Helpers
// ========================================

async function fetchValidatedMetadata(
  slug: string,
): Promise<ValidatedArticleMetadata | null> {
  if (!isDynamoDBConfigured()) return null

  try {
    const raw = await getArticleMetadataBySlug(slug)
    if (!raw) return null

    const result = safeValidateMetadata(raw)
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.warn(
        `[slug/page] Invalid metadata for "${slug}":`,
        result.error.issues,
      )
      return null
    }

    return result.data
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`[slug/page] Failed to fetch metadata for "${slug}"`)
    return null
  }
}
