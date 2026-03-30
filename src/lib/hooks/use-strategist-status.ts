/**
 * useStrategistStatus — TanStack Query Mutation Hook
 *
 * Updates the lifecycle status of a strategist application and
 * invalidates both the detail and list caches on success.
 *
 * @module
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { updateStrategistStatus } from '@/lib/api/admin-api'
import type { ApplicationStatus, InterviewStage, StatusUpdateResponse } from '@/lib/types/strategist.types'

/** Mutation variables for the status update */
interface StatusUpdateVariables {
  /** Application slug */
  readonly slug: string
  /** New lifecycle status */
  readonly status: ApplicationStatus
  /** Optional new interview stage */
  readonly interviewStage?: InterviewStage
}

/**
 * Mutation hook for updating application lifecycle status.
 * Invalidates both the detail and list caches on success.
 *
 * @returns TanStack mutation with status update capabilities
 */
export function useStrategistStatus() {
  const queryClient = useQueryClient()

  return useMutation<StatusUpdateResponse, Error, StatusUpdateVariables>({
    mutationFn: ({ slug, status, interviewStage }) =>
      updateStrategistStatus(slug, status, interviewStage),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.strategist.detail(variables.slug),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.strategist.all,
      })
    },
  })
}
