/**
 * @format
 * Article management server functions for the admin dashboard.
 *
 * All data operations are delegated to the `admin-api` BFF service via
 * authenticated `fetch()` requests. The frontend pod carries no AWS SDK
 * dependencies for this domain.
 *
 * The `requireAuth()` call acts as a fast-path guard — it rejects
 * unauthenticated requests at the edge before the network hop to admin-api.
 * The raw JWT is then forwarded as `Authorization: Bearer <token>` so
 * admin-api can re-verify it with Cognito.
 *
 * @see admin-api/src/routes/articles.ts — upstream implementation
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { requireAuth } from './auth-guard'

// =============================================================================
// Constants
// =============================================================================

const ADMIN_API_URL =
  process.env['ADMIN_API_URL'] ?? 'http://admin-api.admin-api:3002'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns the raw Cognito JWT from the `__session` cookie.
 *
 * The token is forwarded as-is to admin-api, which re-validates it
 * against the Cognito JWKS endpoint.
 *
 * @returns JWT string
 * @throws {Error} If the `__session` cookie is absent (should not occur after requireAuth())
 */
function getSessionToken(): string {
  const token = getCookie('__session')
  if (!token) {
    throw new Error('Session cookie missing after auth guard — this should not happen')
  }
  return token
}

/**
 * Performs an authenticated fetch to the admin-api BFF.
 *
 * @param path - Path relative to `/api/admin` (e.g. `/articles`)
 * @param init - Standard RequestInit options
 * @returns Parsed JSON response body
 * @throws {Error} If the response status is not OK
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken()
  const res = await fetch(`${ADMIN_API_URL}/api/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: string }
      detail = body.error ? ` — ${body.error}` : ''
    } catch {
      // ignore parse failures
    }
    throw new Error(
      `admin-api ${init?.method ?? 'GET'} ${path} failed [${res.status}]${detail}`,
    )
  }

  return res.json() as Promise<T>
}

// =============================================================================
// Types
// =============================================================================

/** Response envelope returned by GET /articles and GET /articles/:slug. */
interface ArticleSummary {
  pk: string
  sk?: string
  title?: string
  excerpt?: string
  status?: string
  author?: string
  date?: string
  publishedAt?: string
  tags?: string[]
  gsi1pk?: string
  updatedAt?: string
}

interface ArticleDetail {
  slug: string
  title: string
  description: string
  status: string
  author: string
  date: string
  contentRef: string
  content: string
}

// =============================================================================
// Input Schemas
// =============================================================================

const getArticlesSchema = z
  .object({ status: z.enum(['all', 'draft', 'review', 'published', 'rejected']).default('all') })
  .default({ status: 'all' })

const slugSchema = z.string().min(1, 'Article slug is required')

const saveContentSchema = z.object({
  id: z.string().min(1, 'Article slug is required'),
  content: z.string(),
})

const saveMetadataSchema = z.object({
  slug: z.string().min(1),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'review', 'published', 'rejected']).optional(),
  publishedAt: z.string().optional(),
  seo: z
    .object({
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
})

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Lists articles, optionally filtered by publication status.
 *
 * @param data.status - `'all'` | `'draft'` | `'review'` | `'published'` | `'rejected'`
 * @returns Array of article summaries from admin-api
 */
export const getArticlesFn = createServerFn({ method: 'GET' })
  .inputValidator(getArticlesSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const qs = data.status !== 'all' ? `?status=${encodeURIComponent(data.status)}` : ''
    const body = await apiFetch<{ articles: ArticleSummary[]; count: number }>(`/articles${qs}`)
    return body.articles
  })

/**
 * Retrieves full article metadata from DynamoDB and the MDX body from S3 (via admin-api).
 *
 * @param data - The article slug
 * @returns Article metadata + content, or null if not found
 */
export const getArticleContentFn = createServerFn({ method: 'GET' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    try {
      const body = await apiFetch<{ article: ArticleDetail }>(
        `/articles/${encodeURIComponent(slug)}`,
      )
      return body.article
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('[404]')) {
        return null
      }
      throw err
    }
  })

/**
 * Publishes a draft article by invoking the Bedrock publish Lambda pipeline (async).
 * The Lambda handles MDX processing, AI enrichment, and S3 upload.
 *
 * @param data - The article slug
 * @returns Success indicator with queued status
 */
export const publishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    const body = await apiFetch<{ queued: boolean; slug: string }>(
      `/articles/${encodeURIComponent(slug)}/publish`,
      { method: 'POST' },
    )
    return { success: body.queued, slug: body.slug }
  })

/**
 * Unpublishes a published article, reverting it to draft status.
 *
 * @param data - The article slug
 * @returns Success indicator
 */
export const unpublishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    await apiFetch<{ updated: boolean; slug: string }>(
      `/articles/${encodeURIComponent(slug)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'draft' }),
      },
    )
    return { success: true }
  })

/**
 * Permanently deletes an article and its content.
 *
 * @param data - The article slug
 * @returns Success indicator
 */
export const deleteArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    await apiFetch<{ deleted: boolean; slug: string }>(
      `/articles/${encodeURIComponent(slug)}`,
      { method: 'DELETE' },
    )
    return { success: true }
  })

/**
 * Saves article markdown content via admin-api (which writes to S3).
 *
 * @param data.id - The article slug
 * @param data.content - Markdown content body
 * @returns Success indicator
 */
export const saveArticleContentFn = createServerFn({ method: 'POST' })
  .inputValidator(saveContentSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    // admin-api PUT /:slug accepts a `content` field and persists it to S3
    await apiFetch<{ updated: boolean; slug: string }>(
      `/articles/${encodeURIComponent(data.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content: data.content }),
      },
    )
    return { success: true }
  })

/**
 * Updates article metadata (title, excerpt, tags, SEO fields, etc.).
 *
 * @param data - Object containing `slug` and any updatable metadata fields
 * @returns Success indicator
 */
export const saveArticleMetadataFn = createServerFn({ method: 'POST' })
  .inputValidator(saveMetadataSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const { slug, ...updates } = data

    await apiFetch<{ updated: boolean; slug: string }>(
      `/articles/${encodeURIComponent(slug)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
    )
    return { success: true }
  })
