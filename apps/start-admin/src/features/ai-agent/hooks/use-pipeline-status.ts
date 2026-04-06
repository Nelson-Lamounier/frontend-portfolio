/**
 * Pipeline Status Hook
 *
 * TanStack Query hook for polling the Bedrock pipeline status.
 * Auto-polls every 10 seconds while the pipeline is in an active
 * state (pending or processing). Stops polling once the pipeline
 * reaches a terminal state or the polling timeout is exceeded.
 *
 * @module
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { getPipelineStatusFn } from '../../../server/pipelines'

export type PipelineState =
  | 'pending'
  | 'processing'
  | 'review'
  | 'published'
  | 'rejected'
  | 'failed'

export interface PipelineStatusResponse {
  readonly slug: string
  readonly pipelineState: PipelineState
  readonly s3ReviewExists: boolean
  readonly dynamoMetadata: boolean
  readonly title?: string
  readonly updatedAt?: string
  readonly statusRaw?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Polling interval in milliseconds (10 seconds) */
const POLL_INTERVAL_MS = 10_000

/** Maximum polling duration before timeout (10 minutes) */
const POLL_TIMEOUT_MS = 10 * 60 * 1_000

/** Pipeline states that should stop polling */
const TERMINAL_STATES: ReadonlySet<PipelineState> = new Set([
  'review',
  'published',
  'rejected',
  'failed',
])

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Auto-polling hook for tracking Bedrock pipeline status.
 * Polls every 10 seconds while the pipeline is pending or processing.
 * Automatically stops polling when a terminal state is reached or
 * the polling timeout is exceeded (defaults to 10 minutes).
 *
 * @param slug - Article slug to track, or null to disable
 * @returns TanStack Query result with pipeline status + timedOut flag
 */
export function usePipelineStatus(slug: string | null) {
  const pollStartRef = useRef<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const query = useQuery({
    queryKey: adminKeys.pipeline.status(slug ?? ''),
    queryFn: async (): Promise<PipelineStatusResponse> => {
      const result = await getPipelineStatusFn({ data: slug! })
      return result as unknown as PipelineStatusResponse
    },
    enabled: !!slug,
    refetchInterval: (queryResult) => {
      if (timedOut) return false

      const state = queryResult.state.data?.pipelineState
      if (state && TERMINAL_STATES.has(state)) return false

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

      return POLL_INTERVAL_MS
    },
  })

  // Reset timeout state when a terminal state is reached
  useEffect(() => {
    const state = query.data?.pipelineState
    if (state && TERMINAL_STATES.has(state)) {
      pollStartRef.current = null
      setTimedOut(false)
    }
  }, [query.data?.pipelineState])

  return { ...query, timedOut }
}
