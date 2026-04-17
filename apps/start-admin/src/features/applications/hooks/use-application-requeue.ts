import { useMutation, useQueryClient } from '@tanstack/react-query'
import { requeueApplicationFn } from '../../../server/pipelines'

/**
 * Mutation hook for requeuing a failed application analysis via the SQS DLQ.
 * On success, invalidates the application detail query so status refreshes.
 */
export function useApplicationRequeue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { slug: string }) => requeueApplicationFn({ data }),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['application', variables.slug] })
    },
  })
}
