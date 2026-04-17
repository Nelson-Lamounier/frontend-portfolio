/**
 * @format
 * Application management server functions for the admin dashboard.
 *
 * All data operations are delegated to the `admin-api` BFF service via
 * authenticated `fetch()` requests. The frontend pod carries no AWS SDK
 * dependencies for this domain.
 *
 * The `requireAuth()` call acts as a fast-path guard — it rejects
 * unauthenticated requests at the edge before the network hop to admin-api.
 * The raw JWT is then forwarded as `Authorization: Bearer <token>` so
 * admin-api can re-verify it with Cognito.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getCookie } from '@tanstack/react-start/server'
import type {
  ApplicationSummary,
  ApplicationStatus,
  ApplicationDetail,
} from '@/lib/types/applications.types'
import type { ResumeData } from '@/lib/resumes/resume-data'
import { requireAuth } from './auth-guard'

// =============================================================================
// Constants
// =============================================================================

const ADMIN_API_URL =
  process.env['ADMIN_API_URL'] ?? 'http://admin-api.admin-api:3002'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns the raw Cognito JWT from the `__session` cookie.
 *
 * The token is forwarded as-is to admin-api, which re-validates it
 * against the Cognito JWKS endpoint.
 *
 * @returns JWT string
 * @throws {Error} If the `__session` cookie is absent (should not occur after requireAuth())
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
 * @param path - Path relative to `/api/admin` (e.g. `/applications`)
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

const getApplicationsSchema = z
  .object({ status: z.string().default('all') })
  .default({ status: 'all' })

const slugSchema = z.string().min(1, 'Application slug is required')

const updateStatusSchema = z.object({
  slug: z.string().min(1),
  status: z.string().min(1),
  interviewStage: z.string().optional(),
})

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Lists applications, optionally filtered by status.
 *
 * @param data.status - A valid application status or `'all'` (default)
 * @returns Array of application summaries sorted by most recently updated
 */
export const getApplicationsFn = createServerFn({ method: 'GET' })
  .inputValidator(getApplicationsSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const qs = data.status !== 'all' ? `?status=${encodeURIComponent(data.status)}` : ''
    const body = await apiFetch<{ applications: ApplicationSummary[]; count: number }>(
      `/applications${qs}`,
    )
    return body.applications
  })

/**
 * Retrieves the full detail of a single application by slug.
 *
 * @param data - The application slug
 * @returns Full application detail including analysis and interview data
 */
export const getApplicationDetailFn = createServerFn({ method: 'GET' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    const body = await apiFetch<{ application: ApplicationDetail }>(
      `/applications/${encodeURIComponent(slug)}`,
    )
    return body.application
  })

/**
 * Deletes an application and all its related records (analysis, interview, etc.).
 *
 * @param data - The application slug to delete
 * @returns Success indicator
 */
export const deleteApplicationFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    await apiFetch<{ deleted: boolean; slug: string }>(
      `/applications/${encodeURIComponent(slug)}`,
      { method: 'DELETE' },
    )
    return { success: true }
  })

/**
 * Updates the status (and optionally interview stage) of an application.
 *
 * @param data.slug - The application slug
 * @param data.status - The new status
 * @param data.interviewStage - Optional new interview stage
 * @returns Success indicator with the new status
 */
export const updateApplicationStatusFn = createServerFn({ method: 'POST' })
  .inputValidator(updateStatusSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const body = await apiFetch<{ success: boolean; status: ApplicationStatus }>(
      `/applications/${encodeURIComponent(data.slug)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({
          status: data.status,
          interviewStage: data.interviewStage,
        }),
      },
    )
    return { success: body.success, status: body.status }
  })

// =============================================================================
// Tailored Resumes
// =============================================================================

/** A tailored resume extracted from a completed application analysis */
export interface TailoredResumeSummary {
  readonly slug: string
  readonly targetCompany: string
  readonly targetRole: string
  readonly updatedAt: string
  readonly data: ResumeData
}

/**
 * Fetches all applications and extracts AI-generated tailored resumes.
 *
 * Fetches full application detail in parallel for all apps that have
 * completed analysis (any status past 'analysing'), then filters to those
 * with a populated `analysis.tailoredResume`.
 *
 * @returns Tailored resumes sorted newest-first
 */
export const getTailoredResumesFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAuth()

  const { applications } = await apiFetch<{ applications: ApplicationSummary[]; count: number }>(
    '/applications',
  )

  const candidates = applications.filter((a) => a.status !== 'analysing')

  const detailResults = await Promise.allSettled(
    candidates.map((app) =>
      apiFetch<{ application: ApplicationDetail }>(
        `/applications/${encodeURIComponent(app.slug)}`,
      ),
    ),
  )

  const tailored: TailoredResumeSummary[] = []
  detailResults.forEach((result, i) => {
    if (
      result.status === 'fulfilled' &&
      result.value.application.analysis?.tailoredResume
    ) {
      tailored.push({
        slug: candidates[i].slug,
        targetCompany: candidates[i].targetCompany,
        targetRole: candidates[i].targetRole,
        updatedAt: candidates[i].updatedAt,
        data: result.value.application.analysis.tailoredResume,
      })
    }
  })

  return tailored.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
})
