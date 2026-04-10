/**
 * @format
 * FinOps and Observability Metrics server functions for the admin dashboard.
 *
 * All data operations are delegated to the `admin-api` BFF service via
 * authenticated `fetch()` requests. The frontend pod carries no CloudWatch
 * or Cost Explorer SDK dependencies for this domain.
 *
 * The `requireAuth()` call acts as a fast-path guard — it rejects
 * unauthenticated requests at the edge before the network hop to admin-api.
 * The raw JWT is forwarded as `Authorization: Bearer <token>` so admin-api
 * can re-verify it with Cognito.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getCookie } from '@tanstack/react-start/server'
import { requireAuth } from './auth-guard'

// =============================================================================
// Constants
// =============================================================================

const ADMIN_API_URL =
  process.env['ADMIN_API_URL'] ?? 'http://admin-api.admin-api:3002'

// =============================================================================
// Types
// =============================================================================

/** A single cost metric value from AWS Cost Explorer. */
interface CostMetricValue {
  Amount?: string
  Unit?: string
}

/** A cost group keyed by billing dimension. */
interface CostGroup {
  Keys?: string[]
  Metrics?: Record<string, CostMetricValue>
}

/**
 * A single day's billing result from AWS Cost Explorer ResultsByTime.
 * Matches the shape used by ReportContainer to sum billed costs.
 */
export interface CostResultItem {
  TimePeriod?: { Start?: string; End?: string }
  Groups?: CostGroup[]
  Estimated?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns the raw Cognito JWT from the `__session` cookie.
 *
 * @returns JWT string
 * @throws {Error} If the `__session` cookie is absent
 */
function getSessionToken(): string {
  const token = getCookie('__session')
  if (!token) {
    throw new Error('Session cookie missing after auth guard — this should not happen')
  }
  return token
}

/**
 * Performs an authenticated fetch to the admin-api BFF.
 *
 * @param path - Path relative to `/api/admin` (e.g. `/finops/realtime`)
 * @param init - Standard RequestInit options
 * @returns Parsed JSON response body
 * @throws Error if the response status is not OK
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken()
  const res = await fetch(`${ADMIN_API_URL}/api/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`admin-api ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// =============================================================================
// Input Schemas
// =============================================================================

const periodSchema = z
  .object({ days: z.number().int().min(1).max(365).default(7) })
  .default({ days: 7 })

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Retrieves real-time usage and performance metrics from CloudWatch.
 * Fetches from the BedrockMultiAgent namespace.
 *
 * @param data.days - Lookback window in days (default 7)
 * @returns Flat token/duration stats record
 */
export const getRealtimeUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    return apiFetch<Record<string, number>>(`/finops/realtime?days=${data.days}`)
  })

/**
 * Retrieves penny-accurate billed costs from AWS Cost Explorer.
 * Filtered by the 'bedrock' Project tag and grouped by inference profile.
 *
 * @param data.days - Lookback window in days (default 7)
 * @returns Array of daily ResultsByTime from Cost Explorer
 */
export const getBilledCostsFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const body = await apiFetch<{ costs: CostResultItem[] }>(`/finops/costs?days=${data.days}`)
    return body.costs
  })

/**
 * Retrieves chatbot usage and security metrics.
 * Fetches from the BedrockChatbot CloudWatch namespace.
 *
 * @param data.days - Lookback window in days (default 7)
 * @returns Flat invocation/safety stats record
 */
export const getChatbotUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    return apiFetch<Record<string, number>>(`/finops/chatbot?days=${data.days}`)
  })

/**
 * Retrieves self-healing token metrics from the SelfHealing CloudWatch namespace.
 *
 * @param data.days - Lookback window in days (default 7)
 * @returns Flat inputTokens / outputTokens stats record
 */
export const getSelfHealingUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    return apiFetch<Record<string, number>>(`/finops/self-healing?days=${data.days}`)
  })
