/**
 * Pipeline Action Hook
 *
 * TanStack Query mutation hook for approving or rejecting an article
 * via the Publish Lambda. Invalidates both pipeline and articles
 * caches on success to ensure the dashboard stays in sync.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { triggerPipelineActionFn } from '../../../server/pipelines'

export interface PipelineActionResponse {
  readonly success: true
  readonly slug: string
  readonly action: string
}

/** Parameters for the pipeline action mutation */
interface PipelineActionParams {
  readonly slug: string
  readonly action: 'approve' | 'reject'
}

/**
 * Mutation hook for approving or rejecting a reviewed article.
 * Invokes the Publish Lambda to move the article between S3 prefixes
 * and update DynamoDB status.
 *
 * Invalidates both pipeline status and articles listing caches on success.
 *
 * @returns TanStack Mutation with `mutate({ slug, action })`
 */
export function usePipelineAction() {
  const queryClient = useQueryClient()

  return useMutation<PipelineActionResponse, Error, PipelineActionParams>({
    mutationFn: async ({ slug, action }: PipelineActionParams) => {
      const result = await triggerPipelineActionFn({ data: { slug, action } })
      return result as unknown as PipelineActionResponse
    },
    onSuccess: (_data, variables) => {
      // Invalidate the pipeline status for this slug
      void queryClient.invalidateQueries({
        queryKey: adminKeys.pipeline.status(variables.slug),
      })
      // Also refresh the articles listing (counts change)
      void queryClient.invalidateQueries({
        queryKey: adminKeys.articles.all,
      })
    },
  })
}
