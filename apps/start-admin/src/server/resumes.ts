/**
 * @format
 * Resume management server functions for the admin dashboard — BFF migration.
 *
 * **Migrated Phase 3 (2026-04):** All DynamoDB operations have been removed.
 * Each handler now forwards the authenticated request to the admin-api BFF service,
 * which owns all data access. The `requireAuth()` pre-flight check is retained locally
 * to fail fast at the edge and forward the session token as Bearer auth.
 *
 * @see admin-api/src/routes/resumes.ts — upstream implementation
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { requireAuth } from './auth-guard'

// =============================================================================
// BFF client helper
// =============================================================================

/**
 * Base URL for the admin-api BFF service.
 * Set via `ADMIN_API_URL` ConfigMap entry (injected by deploy.py).
 * Falls back to in-cluster service DNS for local development.
 */
const ADMIN_API_URL =
  process.env['ADMIN_API_URL'] ?? 'http://admin-api.admin-api:3002'

/**
 * Retrieve the raw Cognito JWT from the session cookie for Bearer forwarding.
 *
 * `requireAuth()` only validates the JWT and returns user info — it does not
 * expose the raw token string. We read the cookie directly here so we can
 * forward it in the Authorization header to admin-api.
 *
 * @returns Raw JWT string from the `__session` cookie
 * @throws Error if the cookie is missing (should not happen after requireAuth())
 */
function getSessionToken(): string {
  const token = getCookie('__session')
  if (!token) {
    throw new Error('Session cookie missing after auth guard — this should not happen')
  }
  return token
}

/**
 * Execute a fetch request to the admin-api BFF, forwarding the Cognito session token.
 *
 * @param path - API path relative to admin-api base URL (e.g. '/api/admin/resumes')
 * @param token - Cognito JWT from the current session cookie
 * @param options - Additional fetch options (method, body, etc.)
 * @returns Parsed JSON response body
 * @throws Error if the response is not OK
 */
async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${ADMIN_API_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { error?: string }
      detail = body.error ? ` — ${body.error}` : ''
    } catch {
      // ignore parse failures
    }
    throw new Error(
      `admin-api ${options.method ?? 'GET'} ${path} failed [${response.status}]${detail}`,
    )
  }

  return response.json() as Promise<T>
}

// =============================================================================
// JSON value type (avoids Record<string, unknown> strict-mode incompatibility)
// =============================================================================

/**
 * Represents any JSON-serialisable value.
 * Used for resume `data` to satisfy TypeScript strict `{}` index signature requirements.
 */
type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

// =============================================================================
// Input schemas (unchanged from original — validation stays local)
// =============================================================================

const resumeIdSchema = z.string().min(1, 'Resume ID is required')

const createResumeSchema = z.object({
  label: z.string().min(1, 'Resume label is required'),
  data: z.record(z.unknown()),
})

const updateResumeSchema = z.object({
  resumeId: z.string().min(1),
  label: z.string().min(1, 'Resume label is required'),
  data: z.record(z.unknown()),
})

// =============================================================================
// Response shapes from admin-api
// =============================================================================

interface ResumeSummary {
  resumeId: string
  label: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ResumeWithData extends ResumeSummary {
  data: Record<string, JsonValue>
}

// =============================================================================
// Server Functions — BFF-mediated
// =============================================================================

/**
 * Lists all resume templates.
 *
 * @returns Array of resume summary records
 */
export const getResumesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const token = getSessionToken()
    await requireAuth()
    const response = await apiFetch<{ resumes: ResumeSummary[]; count: number }>(
      '/api/admin/resumes',
      token,
    )
    return response.resumes
  },
)

/**
 * Retrieves a single resume by ID.
 *
 * @param data - The resume ID
 * @returns Full resume record with content data
 */
export const getResumeFn = createServerFn({ method: 'GET' })
  .inputValidator(resumeIdSchema)
  .handler(async ({ data: resumeId }) => {
    const token = getSessionToken()
    await requireAuth()
    const response = await apiFetch<{ resume: ResumeWithData }>(
      `/api/admin/resumes/${resumeId}`,
      token,
    )
    return response.resume
  })

/**
 * Creates a new resume template.
 *
 * @param data.label - Human-readable label for the resume
 * @param data.data - Full resume data structure
 * @returns Created resume record
 */
export const createResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(createResumeSchema)
  .handler(async ({ data }) => {
    const token = getSessionToken()
    await requireAuth()
    const response = await apiFetch<{ resume: ResumeWithData }>(
      '/api/admin/resumes',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ label: data.label, data: data.data }),
      },
    )
    return response.resume
  })

/**
 * Updates an existing resume template.
 *
 * @param data.resumeId - The resume ID to update
 * @param data.label - Updated label
 * @param data.data - Updated resume data structure
 * @returns Updated resume record
 */
export const updateResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(updateResumeSchema)
  .handler(async ({ data }) => {
    const token = getSessionToken()
    await requireAuth()
    const response = await apiFetch<{ resume: ResumeWithData }>(
      `/api/admin/resumes/${data.resumeId}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({ label: data.label, data: data.data }),
      },
    )
    return response.resume
  })

/**
 * Permanently deletes a resume template.
 * Guards against deleting the currently active resume (409 from admin-api).
 *
 * @param data - The resume ID
 * @returns Success indicator
 */
export const deleteResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(resumeIdSchema)
  .handler(async ({ data: resumeId }) => {
    const token = getSessionToken()
    await requireAuth()
    await apiFetch<{ deleted: boolean; resumeId: string }>(
      `/api/admin/resumes/${resumeId}`,
      token,
      { method: 'DELETE' },
    )
    return { success: true }
  })

/**
 * Sets a resume as the active/default template.
 * Deactivates any previously active resume atomically inside admin-api.
 *
 * @param data - The resume ID to activate
 * @returns The newly activated resume record
 */
export const setActiveResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(resumeIdSchema)
  .handler(async ({ data: resumeId }) => {
    const token = getSessionToken()
    await requireAuth()
    const response = await apiFetch<{ resume: ResumeWithData }>(
      `/api/admin/resumes/${resumeId}/activate`,
      token,
      { method: 'POST' },
    )
    return response.resume
  })

/**
 * Retrieves the currently active resume template.
 *
 * @returns The active resume record or null if none is configured
 */
export const getActiveResumeFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const token = getSessionToken()
    await requireAuth()
    try {
      const response = await apiFetch<{ resume: ResumeWithData }>(
        '/api/admin/resumes/active',
        token,
      )
      return response.resume
    } catch (err: unknown) {
      // 404 = no active resume configured — return null so the UI falls back gracefully
      if (err instanceof Error && err.message.includes('[404]')) {
        return null
      }
      throw err
    }
  },
)
