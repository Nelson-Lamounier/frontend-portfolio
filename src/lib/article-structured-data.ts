/**
 * Article Structured Data — Hybrid SEO Pattern
 *
 * Generates JSON-LD, Next.js Metadata API objects, and OpenGraph
 * metadata from Zod-validated article metadata.
 *
 * Approach matrix:
 * | Approach            | Best For          | AI Benefit                              |
 * |:--------------------|:------------------|:----------------------------------------|
 * | JSON-LD             | Standard SEO      | High visibility in "Answer Boxes"       |
 * | Microdata           | Inline content    | AI understands specific text fragments  |
 * | TypeScript Interfaces | Internal sync   | API and frontend agree on data labels   |
 * | Markdown + Frontmatter | Documentation | Easy for LLMs to parse                  |
 */

import type { Metadata } from 'next'

import type { ValidatedArticleMetadata } from './types/content-schemas'

// ========================================
// JSON-LD Generation
// ========================================

/**
 * Generates a JSON-LD `TechArticle` schema from validated metadata.
 * Inject into the page via `<script type="application/ld+json">`.
 *
 * @see https://schema.org/TechArticle
 */
export function generateArticleJsonLd(
  metadata: ValidatedArticleMetadata,
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nelsonlamounier.com',
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: metadata.title,
    description: metadata.description,
    author: {
      '@type': 'Person',
      name: metadata.author,
      url: siteUrl,
    },
    datePublished: metadata.date,
    dateModified: metadata.date,
    url: `${siteUrl}/articles/${metadata.slug}`,
    ...(metadata.heroImageUrl && {
      image: {
        '@type': 'ImageObject',
        url: metadata.heroImageUrl,
      },
    }),
    ...(metadata.tags.length > 0 && {
      keywords: metadata.tags.join(', '),
    }),
    ...(metadata.aiSummary && {
      abstract: metadata.aiSummary,
    }),
    ...(metadata.readingTimeMinutes && {
      timeRequired: `PT${metadata.readingTimeMinutes}M`,
    }),
    publisher: {
      '@type': 'Person',
      name: metadata.author,
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/articles/${metadata.slug}`,
    },
  }
}

// ========================================
// Next.js Metadata API
// ========================================

/**
 * Generates a Next.js `Metadata` object for `generateMetadata()`.
 * Includes title, description, OpenGraph, and Twitter card metadata.
 */
export function generateArticleMetadata(
  metadata: ValidatedArticleMetadata,
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nelsonlamounier.com',
): Metadata {
  const articleUrl = `${siteUrl}/articles/${metadata.slug}`

  return {
    title: metadata.title,
    description: metadata.description,
    authors: [{ name: metadata.author }],
    ...(metadata.tags.length > 0 && {
      keywords: metadata.tags,
    }),
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      type: 'article',
      url: articleUrl,
      publishedTime: metadata.date,
      authors: [metadata.author],
      ...(metadata.tags.length > 0 && {
        tags: metadata.tags,
      }),
      ...(metadata.heroImageUrl && {
        images: [
          {
            url: metadata.heroImageUrl,
            alt: metadata.title,
          },
        ],
      }),
    },
    twitter: {
      card: metadata.heroImageUrl ? 'summary_large_image' : 'summary',
      title: metadata.title,
      description: metadata.description,
      ...(metadata.heroImageUrl && {
        images: [metadata.heroImageUrl],
      }),
    },
    alternates: {
      canonical: articleUrl,
    },
  }
}
