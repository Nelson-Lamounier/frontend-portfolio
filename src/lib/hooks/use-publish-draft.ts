/**
 * Publish Draft Hook
 *
 * TanStack Query mutation hook for publishing draft files via the
 * AI Agent / Publish page. Invalidates article cache on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { publishDraft } from '@/lib/api/admin-api'
import type { PublishDraftResponse } from '@/lib/api/admin-api'

/** Parameters for the publish draft mutation */
interface PublishDraftParams {
  readonly fileName: string
  readonly content: string
}

/**
 * Mutation hook for publishing a draft file to S3 via the Bedrock pipeline.
 * Invalidates the articles cache on success to update listings.
 *
 * @returns TanStack Mutation with `mutate({ fileName, content })`
 */
export function usePublishDraft() {
  const queryClient = useQueryClient()

  return useMutation<PublishDraftResponse, Error, PublishDraftParams>({
    mutationFn: ({ fileName, content }: PublishDraftParams) =>
      publishDraft(fileName, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}
