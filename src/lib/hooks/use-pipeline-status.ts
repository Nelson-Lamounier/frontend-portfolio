/**
 * Pipeline Status Hook
 *
 * TanStack Query hook for polling the Bedrock pipeline status.
 * Auto-polls every 10 seconds while the pipeline is in a non-terminal
 * state (pending or processing). Stops polling once the pipeline
 * reaches review, published, rejected, or failed.
 */

import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchPipelineStatus } from '@/lib/api/admin-api'
import type { PipelineState } from '@/lib/api/admin-api'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Polling interval in milliseconds (10 seconds) */
const POLL_INTERVAL_MS = 10_000

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
 * Automatically stops polling when a terminal state is reached.
 *
 * @param slug - Article slug to track, or null to disable
 * @returns TanStack Query result with pipeline status
 */
export function usePipelineStatus(slug: string | null) {
  return useQuery({
    queryKey: adminKeys.pipeline.status(slug ?? ''),
    queryFn: () => fetchPipelineStatus(slug!),
    enabled: !!slug,
    refetchInterval: (query) => {
      const state = query.state.data?.pipelineState
      if (state && TERMINAL_STATES.has(state)) return false
      return POLL_INTERVAL_MS
    },
  })
}
