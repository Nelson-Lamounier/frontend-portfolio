/**
 * useStrategistTrigger — TanStack Query Mutation Hook
 *
 * Triggers a new strategist analysis pipeline and invalidates the
 * applications list cache on success.
 *
 * @module
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { triggerStrategistAnalysis } from '@/lib/api/admin-api'
import type { AnalyseTriggerBody, TriggerResponse } from '@/lib/types/strategist.types'

/**
 * Mutation hook for triggering a strategist analysis pipeline.
 * Invalidates the strategist application list on success.
 *
 * @returns TanStack mutation with trigger capabilities
 */
export function useStrategistTrigger() {
  const queryClient = useQueryClient()

  return useMutation<TriggerResponse, Error, AnalyseTriggerBody>({
    mutationFn: triggerStrategistAnalysis,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.strategist.all,
      })
    },
  })
}
