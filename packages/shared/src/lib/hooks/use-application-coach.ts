/**
 * useApplicationsCoach — TanStack Query Mutation Hook
 *
 * Triggers the Coach pipeline for a specific interview stage on an
 * existing application. Invalidates both detail and list caches on success.
 *
 * @module
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { triggerApplicationsCoach } from '@/lib/api/admin-api'
import type { CoachTriggerBody, TriggerResponse } from '@/lib/types/applications.types'

/**
 * Mutation hook for triggering the Coach pipeline.
 * Invalidates the application detail and list caches on success.
 *
 * @returns TanStack mutation with coach trigger capabilities
 */
export function useApplicationCoach() {
  const queryClient = useQueryClient()

  return useMutation<TriggerResponse, Error, CoachTriggerBody>({
    mutationFn: triggerApplicationsCoach,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.detail(variables.applicationSlug),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.all,
      })
    },
  })
}
