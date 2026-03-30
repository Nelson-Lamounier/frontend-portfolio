/**
 * useStrategistDetail — TanStack Query Hook
 *
 * Fetches full application detail for a single strategist application.
 * Polls at 5-second intervals while the application is in 'analysing'
 * status, stopping once a terminal state is reached.
 *
 * @module
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchStrategistApplication } from '@/lib/api/admin-api'
import type { ApplicationDetail } from '@/lib/types/strategist.types'

/** Polling interval during analysis (5 seconds) */
const ANALYSIS_POLL_INTERVAL = 5_000

/**
 * Fetches full application detail with auto-polling during analysis.
 *
 * @param slug - Application slug
 * @returns TanStack Query result with ApplicationDetail
 */
export function useStrategistDetail(slug: string) {
  return useQuery<ApplicationDetail>({
    queryKey: adminKeys.strategist.detail(slug),
    queryFn: () => fetchStrategistApplication(slug),
    enabled: Boolean(slug),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'analysing' ? ANALYSIS_POLL_INTERVAL : false
    },
  })
}
