/**
 * useStrategistDetail — TanStack Query Hook
 *
 * Fetches full application detail for a single strategist application.
 * Polls at 5-second intervals while the application is in an active
 * pipeline state ('analysing' or 'coaching'), stopping once a terminal
 * state is reached or the polling timeout is exceeded.
 *
 * @module
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchStrategistApplication } from '@/lib/api/admin-api'
import type { ApplicationDetail, ApplicationStatus } from '@/lib/types/strategist.types'

/** Polling interval during pipeline execution (5 seconds) */
const PIPELINE_POLL_INTERVAL = 5_000

/** Maximum polling duration before timeout (10 minutes) */
const POLL_TIMEOUT_MS = 10 * 60 * 1_000

/** Statuses that indicate an active pipeline — should be polled */
const ACTIVE_PIPELINE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'analysing',
  'coaching',
])

/**
 * Fetches full application detail with auto-polling during active pipelines.
 *
 * Polling stops when:
 * - The status transitions to a terminal state
 * - The polling timeout is exceeded (defaults to 10 minutes)
 *
 * @param slug - Application slug
 * @returns TanStack Query result with ApplicationDetail + timedOut flag
 */
export function useStrategistDetail(slug: string) {
  const pollStartRef = useRef<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const query = useQuery<ApplicationDetail>({
    queryKey: adminKeys.strategist.detail(slug),
    queryFn: () => fetchStrategistApplication(slug),
    enabled: Boolean(slug),
    refetchInterval: (queryResult) => {
      if (timedOut) return false

      const status = queryResult.state.data?.status
      if (!status) return false

      const isActive = ACTIVE_PIPELINE_STATUSES.has(status)
      if (!isActive) return false

      // Start timeout timer on first active poll
      if (!pollStartRef.current) {
        pollStartRef.current = Date.now()
      }

      // Check if we've exceeded the timeout
      const elapsed = Date.now() - pollStartRef.current
      if (elapsed > POLL_TIMEOUT_MS) {
        setTimedOut(true)
        return false
      }

      return PIPELINE_POLL_INTERVAL
    },
  })

  // Reset timeout state when status changes to non-active
  useEffect(() => {
    const status = query.data?.status
    if (status && !ACTIVE_PIPELINE_STATUSES.has(status)) {
      pollStartRef.current = null
      setTimedOut(false)
    }
  }, [query.data?.status])

  return { ...query, timedOut }
}
