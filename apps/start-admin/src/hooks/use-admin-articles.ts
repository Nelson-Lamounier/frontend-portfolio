import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { entityToArticle } from '@/lib/types/article.types'
import {
  getArticlesFn,
  getArticleContentFn,
  getArticleVersionsFn,
  publishArticleFn,
  unpublishArticleFn,
  deleteArticleFn,
  saveArticleMetadataFn,
  saveArticleContentFn,
  type ArticleVersion,
} from '../server/articles'

export type { ArticleVersion }

// =============================================================================
// Types
// =============================================================================

export interface AdminArticlesData {
  readonly all: ArticleWithSlug[]
  readonly drafts: ArticleWithSlug[]
  readonly processing: ArticleWithSlug[]
  readonly published: ArticleWithSlug[]
  readonly review: ArticleWithSlug[]
  readonly flagged: ArticleWithSlug[]
  readonly failed: ArticleWithSlug[]
  readonly draftCount: number
  readonly processingCount: number
  readonly publishedCount: number
  readonly reviewCount: number
  readonly flaggedCount: number
  readonly failedCount: number
  readonly totalCount: number
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetches all articles and shapes them into draft/published buckets.
 *
 * @returns TanStack Query result with `AdminArticlesData`
 */
export function useAdminArticles() {
  return useQuery<AdminArticlesData>({
    queryKey: adminKeys.articles.list('all'),
    queryFn: async (): Promise<AdminArticlesData> => {
      const items = await getArticlesFn({ data: { status: 'all' } })
      const raw = (items as unknown as Record<string, unknown>[])

      // Deduplicate by slug — prefer METADATA records over VERSION#v<n> records.
      // Until the admin-api FilterExpression fix is deployed, both record types
      // can be returned. A Map keyed by slug keeps the first METADATA entry it
      // encounters; VERSION records are silently discarded.
      const slugMap = new Map<string, Record<string, unknown>>()
      for (const item of raw) {
        const slug =
          (item['slug'] as string) ||
          (typeof item['pk'] === 'string' ? (item['pk'] as string).replace(/^ARTICLE#/, '') : '')
        if (!slug) continue

        const existing = slugMap.get(slug)
        const isMetadata = (item['sk'] as string) === 'METADATA'
        const existingIsMetadata = existing && (existing['sk'] as string) === 'METADATA'

        // Always prefer METADATA over VERSION; keep existing if both are METADATA
        if (!existing || (!existingIsMetadata && isMetadata)) {
          slugMap.set(slug, item)
        }
      }

      const articles = [...slugMap.values()].map(entityToArticle)

      const drafts     = articles.filter((a) => a.status === 'draft')
      const processing = articles.filter((a) => a.status === 'processing')
      const published  = articles.filter((a) => a.status === 'published')
      const review     = articles.filter((a) => a.status === 'review')
      const flagged    = articles.filter((a) => a.status === 'flagged')
      const failed     = articles.filter((a) => a.status === 'rejected')

      return {
        all: articles,
        drafts,
        processing,
        published,
        review,
        flagged,
        failed,
        draftCount:    drafts.length,
        processingCount: processing.length,
        publishedCount: published.length,
        reviewCount:   review.length,
        flaggedCount:  flagged.length,
        failedCount:   failed.length,
        totalCount:    articles.length,
      }
    },
  })
}

/**
 * Fetches full markdown content for a single article.
 *
 * @param slug - Article slug identifier
 * @returns TanStack Query result with article content
 */
export function useArticleContent(slug: string) {
  return useQuery({
    queryKey: adminKeys.articles.content(slug),
    queryFn: () => getArticleContentFn({ data: slug }),
    enabled: slug !== 'new',
  })
}

/**
 * Mutation to publish a draft article.
 *
 * @returns TanStack Mutation result
 */
export function usePublishArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => publishArticleFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation to unpublish a live article (revert to draft).
 *
 * @returns TanStack Mutation result
 */
export function useUnpublishArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => unpublishArticleFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation to permanently delete an article.
 *
 * @returns TanStack Mutation result
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => deleteArticleFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation to update article metadata fields.
 *
 * @returns TanStack Mutation result
 */
export function useUpdateMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, updates }: { slug: string; updates: Record<string, unknown> }) =>
      saveArticleMetadataFn({ data: { slug, ...updates } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation to save article markdown content.
 *
 * @returns TanStack Mutation result
 */
export function useSaveContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, content }: { slug: string; content: string }) =>
      saveArticleContentFn({ data: { id: slug, content } }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.articles.content(variables.slug),
      })
    },
  })
}

/**
 * Fetches the full pipeline version history for an article.
 * Only fires when the accordion is expanded (slug is non-null).
 *
 * @param slug - Article slug, or null to keep the query disabled
 * @returns TanStack Query result with version history
 */
export function useArticleVersions(slug: string | null) {
  return useQuery({
    queryKey: [...adminKeys.articles.all, 'versions', slug] as const,
    queryFn: () => getArticleVersionsFn({ data: slug! }),
    enabled: slug !== null,
    staleTime: 30_000, // 30s — version history rarely changes mid-session
  })
}
