import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { entityToArticle } from '@/lib/types/article.types'
import {
  getArticlesFn,
  getArticleContentFn,
  publishArticleFn,
  unpublishArticleFn,
  deleteArticleFn,
  saveArticleMetadataFn,
  saveArticleContentFn,
} from '../server/articles'

// =============================================================================
// Types
// =============================================================================

export interface AdminArticlesData {
  readonly all: ArticleWithSlug[]
  readonly drafts: ArticleWithSlug[]
  readonly published: ArticleWithSlug[]
  readonly review: ArticleWithSlug[]
  readonly failed: ArticleWithSlug[]
  readonly draftCount: number
  readonly publishedCount: number
  readonly reviewCount: number
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
      const articles = (items as Record<string, unknown>[]).map(entityToArticle)

      const drafts = articles.filter((a) => a.status === 'draft')
      const published = articles.filter((a) => a.status === 'published')
      const review = articles.filter((a) => a.status === 'review')
      const failed = articles.filter((a) => a.status === 'rejected')

      return {
        all: articles,
        drafts,
        published,
        review,
        failed,
        draftCount: drafts.length,
        publishedCount: published.length,
        reviewCount: review.length,
        failedCount: failed.length,
        totalCount: articles.length,
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
