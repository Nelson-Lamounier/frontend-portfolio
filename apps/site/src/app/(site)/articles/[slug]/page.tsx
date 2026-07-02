/**
 * Dynamic Article Page — [slug] Route
 *
 * Renders RDS-hosted articles served by the in-cluster public-api BFF.
 * Fetches metadata + Markdown body together, renders via MDXRenderer
 * (MDX is a superset of Markdown), and injects JSON-LD structured data.
 *
 * Existing file-based page.mdx routes take priority over this dynamic
 * route (Next.js behavior), so the current file-based articles are
 * unaffected.
 *
 * Route: /articles/:slug
 * Revalidation: ISR with 1-hour TTL
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ArticleLayout, MDXRenderer } from '@/components/articles'
import { extractToc } from '@/lib/articles/extract-toc'
import {
  generateArticleJsonLd,
  generateArticleMetadata,
} from '@/lib/articles/article-structured-data'
import {
  getAllArticles,
  getArticleBySlug,
  getArticleMetadata,
  isArticlesApiConfigured,
} from '@/lib/articles'
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
 * Generate static params for all published articles.
 * Falls back to empty array when the API is unreachable (build time).
 */
export async function generateStaticParams() {
  if (!isArticlesApiConfigured()) {
    return []
  }

  try {
    const articles = await getAllArticles()
    return articles.map((a) => ({ slug: a.slug }))
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

  // 1. Fetch metadata + Markdown content together from public-api (RDS)
  const detail = await getArticleBySlug(slug)
  if (!detail) notFound()

  // 2. Validate metadata for SEO safety
  const result = safeValidateMetadata(detail.metadata)
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.warn(`[slug/page] Invalid metadata for "${slug}":`, result.error.issues)
    notFound()
  }
  const metadata = result.data

  // 3. Generate JSON-LD structured data
  const jsonLd = generateArticleJsonLd(metadata)

  // 4. Table of contents from the heading tree (the pipeline no longer emits one)
  const toc = extractToc(detail.content.content)

  // 5. Build the article object for ArticleLayout
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

      <ArticleLayout article={article} toc={toc}>
        <MDXRenderer source={detail.content.content} />
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
  if (!isArticlesApiConfigured()) return null

  try {
    const raw = await getArticleMetadata(slug)
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
