/**
 * Admin Articles Hooks
 *
 * TanStack Query hooks for article listing and article mutations
 * (publish, unpublish, delete, metadata update, content editing).
 *
 * All mutations automatically invalidate the articles cache, ensuring
 * the sidebar badge counts and article listings stay in sync.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import {
  deleteArticle,
  fetchAdminArticles,
  fetchArticleContent,
  publishArticle,
  saveArticleContent,
  unpublishArticle,
  updateArticleMetadata,
} from '@/lib/api/admin-api'
import type { AdminArticlesResponse, ArticleContentResponse } from '@/lib/api/admin-api'

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Fetches the full admin articles listing (drafts + published).
 *
 * @returns TanStack Query result with articles data
 */
export function useAdminArticles() {
  return useQuery<AdminArticlesResponse>({
    queryKey: adminKeys.articles.list('all'),
    queryFn: fetchAdminArticles,
  })
}

/**
 * Fetches article content (MDX) and metadata for the editor.
 *
 * @param slug - Article slug to fetch content for
 * @returns TanStack Query result with full content response
 */
export function useArticleContent(slug: string) {
  return useQuery<ArticleContentResponse>({
    queryKey: adminKeys.articles.content(slug),
    queryFn: () => fetchArticleContent(slug),
    enabled: slug !== 'new',
  })
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Mutation hook for publishing a draft article.
 * Invalidates the articles cache on success.
 *
 * @returns TanStack Mutation with `mutate(slug)` / `mutateAsync(slug)`
 */
export function usePublishArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => publishArticle(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation hook for unpublishing an article.
 * Invalidates the articles cache on success.
 *
 * @returns TanStack Mutation with `mutate(slug)` / `mutateAsync(slug)`
 */
export function useUnpublishArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => unpublishArticle(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation hook for deleting an article.
 * Invalidates the articles cache on success.
 *
 * @returns TanStack Mutation with `mutate(slug)` / `mutateAsync(slug)`
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => deleteArticle(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation hook for updating article metadata (e.g., githubUrl).
 * Invalidates the articles cache on success.
 *
 * @returns TanStack Mutation with `mutate({ slug, updates })`
 */
export function useUpdateMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, updates }: { slug: string; updates: Record<string, unknown> }) =>
      updateArticleMetadata(slug, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

/**
 * Mutation hook for saving article content in the editor.
 * Invalidates the specific article content cache on success.
 *
 * @returns TanStack Mutation with `mutate({ slug, content })`
 */
export function useSaveContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, content }: { slug: string; content: string }) =>
      saveArticleContent(slug, content),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.articles.content(variables.slug),
      })
    },
  })
}
