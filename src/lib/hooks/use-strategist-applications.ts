/**
 * useStrategistApplications — TanStack Query Hook
 *
 * Fetches the strategist application listing with optional status filtering.
 * Enables auto-polling at 5-second intervals when any entries have active
 * pipeline status ('analysing' or 'coaching'), stopping once all reach
 * a terminal state or the polling timeout is exceeded.
 *
 * @module
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchStrategistApplications, deleteStrategistApplication } from '@/lib/api/admin-api'
import { useToastStore } from '@/lib/stores/toast-store'
import type { ApplicationStatus, ApplicationSummary } from '@/lib/types/strategist.types'

/** Polling interval for active pipeline entries (5 seconds) */
const PIPELINE_POLL_INTERVAL = 5_000

/** Maximum polling duration before timeout (10 minutes) */
const POLL_TIMEOUT_MS = 10 * 60 * 1_000

/** Statuses that indicate an active pipeline — should be polled */
const ACTIVE_PIPELINE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'analysing',
  'coaching',
])

/**
 * Fetches strategist applications with auto-polling for active pipeline entries.
 *
 * Polling stops when:
 * - All entries reach a terminal state
 * - The polling timeout is exceeded (defaults to 10 minutes)
 *
 * @param status - Status filter (default: 'all')
 * @returns TanStack Query result with ApplicationSummary[] + timedOut flag
 */
export function useStrategistApplications(status = 'all') {
  const pollStartRef = useRef<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const query = useQuery<ApplicationSummary[]>({
    queryKey: adminKeys.strategist.applications(status),
    queryFn: () => fetchStrategistApplications(status),
    refetchInterval: (queryResult) => {
      if (timedOut) return false

      const data = queryResult.state.data
      if (!data) return false

      const hasActive = data.some((app) =>
        ACTIVE_PIPELINE_STATUSES.has(app.status),
      )
      if (!hasActive) return false

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

  // Reset timeout state when no active entries
  useEffect(() => {
    const data = query.data
    if (!data) return

    const hasActive = data.some((app) =>
      ACTIVE_PIPELINE_STATUSES.has(app.status),
    )
    if (!hasActive) {
      pollStartRef.current = null
      setTimedOut(false)
    }
  }, [query.data])

  return { ...query, timedOut }
}

// =============================================================================
// DELETE APPLICATION
// =============================================================================
export function useDeleteStrategistApplication() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: deleteStrategistApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.strategist.all })
      addToast('success', 'Application deleted.')
    },
    onError: (err) => {
      addToast('error', `Failed to delete application: ${err.message}`)
    },
  })
}
