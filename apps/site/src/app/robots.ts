/**
 * robots.txt (App Router `robots.ts` → /robots.txt).
 *
 * Allows crawling of all public pages, disallows the API surface (no crawlable
 * content there), and points crawlers at the sitemap.
 */

import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
