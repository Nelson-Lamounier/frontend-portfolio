/**
 * Dynamic sitemap (App Router `sitemap.ts` → /sitemap.xml).
 *
 * Combines the static public routes with published article detail pages.
 * Article slugs come from the same BFF-backed service the pages use, so the
 * sitemap stays in sync with what actually renders. `getAllArticles()` degrades
 * to `[]` when the BFF is unreachable at Docker-build time, so the sitemap still
 * builds (static routes only) and ISR fills in articles at runtime.
 */

import type { MetadataRoute } from 'next'

import { getAllArticles } from '@/lib/articles/article-service'
import { SITE_URL } from '@/lib/site-config'

// Regenerate hourly, matching the article pages' ISR window.
export const revalidate = 3600

/** Public, indexable static routes (excludes /thank-you — a post-action page). */
const STATIC_PATHS = ['', '/about', '/articles', '/projects', '/uses', '/music'] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  // getAllArticles() already returns [] on any failure — no throw to guard.
  const articles = await getAllArticles()
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: article.date ? new Date(article.date) : now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [...staticEntries, ...articleEntries]
}
