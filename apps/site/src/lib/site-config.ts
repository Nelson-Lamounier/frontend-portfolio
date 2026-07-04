/**
 * Canonical public origin of the site.
 *
 * Single source of truth for absolute URLs used by SEO surfaces —
 * `metadataBase`, `sitemap.ts`, `robots.ts`, and the RSS `alternates` link.
 * Set `NEXT_PUBLIC_SITE_URL` per environment; falls back to the production
 * domain so builds and previews never emit `undefined/...` URLs.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nelsonlamounier.com'
).replace(/\/$/, '')
