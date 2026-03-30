/**
 * useStrategistApplications — TanStack Query Hook
 *
 * Fetches the strategist application listing with optional status filtering.
 * Enables auto-polling at 5-second intervals when any entries have
 * 'analysing' status, stopping once all reach a terminal state.
 *
 * @module
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchStrategistApplications } from '@/lib/api/admin-api'
import type { ApplicationSummary } from '@/lib/types/strategist.types'

/** Polling interval for active analysis entries (5 seconds) */
const ANALYSIS_POLL_INTERVAL = 5_000

/**
 * Fetches strategist applications with auto-polling for 'analysing' entries.
 *
 * @param status - Status filter (default: 'all')
 * @returns TanStack Query result with ApplicationSummary[]
 */
export function useStrategistApplications(status = 'all') {
  return useQuery<ApplicationSummary[]>({
    queryKey: adminKeys.strategist.applications(status),
    queryFn: () => fetchStrategistApplications(status),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      const hasAnalysing = data.some((app) => app.status === 'analysing')
      return hasAnalysing ? ANALYSIS_POLL_INTERVAL : false
    },
  })
}
