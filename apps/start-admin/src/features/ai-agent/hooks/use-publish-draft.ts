import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@repo/shared/src/lib/api/query-keys'
import { publishDraftFn } from '../../../server/draft-publish'

interface PublishDraftParams {
  readonly fileName: string
  readonly content: string
}

export function usePublishDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fileName, content }: PublishDraftParams) => {
      const result = await publishDraftFn({ data: { fileName, content } })
      if (!result.success) {
        // Surface the underlying admin-api error, not just the generic message
        const detail = result.error ? ` — ${result.error}` : ''
        throw new Error(`${result.message}${detail}`)
      }
      return result
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
      void queryClient.invalidateQueries({ queryKey: adminKeys.pipeline.all })
    },
  })
}
