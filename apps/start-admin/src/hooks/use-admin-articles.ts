import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import {
  getArticlesFn,
  getArticleContentFn,
  publishArticleFn,
  unpublishArticleFn,
  deleteArticleFn,
  saveArticleMetadataFn,
  saveArticleContentFn,
} from '../server/articles'

export function useAdminArticles() {
  return useQuery({
    queryKey: adminKeys.articles.list('all'),
    queryFn: () => getArticlesFn({ data: { status: 'all' } }),
  })
}

export function useArticleContent(slug: string) {
  return useQuery({
    queryKey: adminKeys.articles.content(slug),
    queryFn: () => getArticleContentFn({ data: slug }),
    enabled: slug !== 'new',
  })
}

export function usePublishArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => publishArticleFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

export function useUnpublishArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => unpublishArticleFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

export function useDeleteArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => deleteArticleFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}

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
