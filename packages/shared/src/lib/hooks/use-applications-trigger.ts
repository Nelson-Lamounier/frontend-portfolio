/**
 * useApplicationsTrigger — TanStack Query Mutation Hook
 *
 * Triggers a new applications analysis pipeline and invalidates the
 * applications list cache on success.
 *
 * @module
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { triggerApplicationsAnalysis } from '@/lib/api/admin-api'
import type { AnalyseTriggerBody, TriggerResponse } from '@/lib/types/applications.types'

/**
 * Mutation hook for triggering a applications analysis pipeline.
 * Invalidates the applications application list on success.
 *
 * @returns TanStack mutation with trigger capabilities
 */
export function useApplicationsTrigger() {
  const queryClient = useQueryClient()

  return useMutation<TriggerResponse, Error, AnalyseTriggerBody>({
    mutationFn: triggerApplicationsAnalysis,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.all,
      })
    },
  })
}
