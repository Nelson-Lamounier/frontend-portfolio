/**
 * @format
 * Pipeline action server functions for the admin dashboard.
 *
 * All data operations are delegated to the `admin-api` BFF service via
 * authenticated `fetch()` requests. The frontend pod carries no AWS SDK
 * dependencies (S3, DynamoDB, Lambda) for this domain.
 *
 * The `requireAuth()` call acts as a fast-path guard — it rejects
 * unauthenticated requests at the edge before the network hop to admin-api.
 * The raw JWT is forwarded as `Authorization: Bearer <token>` so admin-api
 * can re-verify it with Cognito.
 *
 * @see admin-api/src/routes/pipelines.ts — upstream implementation
 * @see admin-api/src/routes/articles.ts  — publish route (POST /:slug/publish)
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { requireAuth } from './auth-guard'
import type { TriggerResponse } from '@/lib/types/applications.types'

// =============================================================================
// Constants
// =============================================================================

const ADMIN_API_URL =
  process.env['ADMIN_API_URL'] ?? 'http://admin-api.admin-api:3002'

// =============================================================================
// Types
// =============================================================================

type PipelineState = 'pending' | 'processing' | 'review' | 'published' | 'rejected' | 'failed'

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
 * @param path - Path relative to admin-api base URL (e.g. `/api/admin/pipelines/article`)
 * @param init - Standard RequestInit options
 * @returns Parsed JSON response body
 * @throws {Error} If the response status is not OK
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken()
  const res = await fetch(`${ADMIN_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: string }
      detail = body.error ? ` — ${body.error}` : ''
    } catch {
      // ignore parse failures
    }
    throw new Error(
      `admin-api ${init?.method ?? 'GET'} ${path} failed [${res.status}]${detail}`,
    )
  }

  return res.json() as Promise<T>
}

// =============================================================================
// Input Schemas
// =============================================================================

const slugSchema = z.string().min(1, 'Article slug is required')

const pipelineActionSchema = z.object({
  slug: z.string().min(1),
  action: z.enum(['approve', 'reject']),
})

const strategistCoachSchema = z.object({
  slug: z.string().min(1),
  coachingType: z.enum(['GENERAL', 'TECHNICAL', 'BEHAVIOURAL', 'CULTURAL']),
  targetCompany: z.string().min(1),
  targetRole: z.string().min(1),
  resumeId: z.string().optional(),
})

const analyseTriggerSchema = z.object({
  jobDescription: z.string(),
  targetCompany: z.string(),
  targetRole: z.string(),
  interviewStage: z
    .enum([
      'applied',
      'phone-screen',
      'technical',
      'system-design',
      'behavioural',
      'bar-raiser',
      'final',
    ])
    .optional(),
  resumeId: z.string().optional(),
  includeCoverLetter: z.boolean().optional(),
})

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Retrieves the current pipeline status for an article.
 *
 * Delegates to `GET /api/admin/articles/:slug` on admin-api, which returns
 * the DynamoDB metadata record including the `status` field used to derive
 * pipeline state.
 *
 * @param data - The article slug
 * @returns Pipeline state and metadata
 */
export const getPipelineStatusFn = createServerFn({ method: 'GET' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    try {
      const body = await apiFetch<{
        article: {
          status?: string
          title?: string
          updatedAt?: string
        }
      }>(`/api/admin/articles/${encodeURIComponent(slug)}`)

      const article = body.article
      const dynamoStatus = article.status

      // Derive pipeline state from article status
      const pipelineState = ((): PipelineState => {
        if (dynamoStatus === 'published') return 'published'
        if (dynamoStatus === 'rejected') return 'rejected'
        if (dynamoStatus === 'review') return 'review'
        if (dynamoStatus === 'processing') return 'processing'
        if (dynamoStatus === 'draft') return 'pending'
        if (!dynamoStatus) return 'pending'
        return 'failed'
      })()

      return {
        slug,
        pipelineState,
        s3ReviewExists: pipelineState === 'review',
        dynamoMetadata: true,
        title: article.title,
        updatedAt: article.updatedAt,
        statusRaw: dynamoStatus,
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('[404]')) {
        return {
          slug,
          pipelineState: 'pending' as PipelineState,
          s3ReviewExists: false,
          dynamoMetadata: false,
        }
      }
      return {
        slug,
        pipelineState: 'failed' as PipelineState,
        s3ReviewExists: false,
        dynamoMetadata: false,
      }
    }
  })

/**
 * Triggers the publish/reject Lambda for an article via admin-api.
 *
 * Routes to `POST /api/admin/articles/:slug/publish` (approve) or
 * `PUT /api/admin/articles/:slug` with `{ status: 'rejected' }` (reject).
 *
 * @param data.slug - The article slug
 * @param data.action - `'approve'` or `'reject'`
 * @returns Success indicator with slug and action
 */
export const triggerPipelineActionFn = createServerFn({ method: 'POST' })
  .inputValidator(pipelineActionSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    if (data.action === 'approve') {
      await apiFetch<{ queued: boolean; slug: string }>(
        `/api/admin/articles/${encodeURIComponent(data.slug)}/publish`,
        { method: 'POST' },
      )
    } else {
      await apiFetch<{ updated: boolean; slug: string }>(
        `/api/admin/articles/${encodeURIComponent(data.slug)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'rejected' }),
        },
      )
    }

    return {
      success: true,
      slug: data.slug,
      action: data.action,
    }
  })

/**
 * Triggers the strategist coaching Lambda for interview preparation via admin-api.
 *
 * @param data.slug - Application slug
 * @param data.coachingType - Type of coaching session
 * @param data.targetCompany - Target company name
 * @param data.targetRole - Target role title
 * @param data.resumeId - Optional resume ID to include
 * @returns Parsed Lambda response body from admin-api
 */
export const triggerStrategistCoachFn = createServerFn({ method: 'POST' })
  .inputValidator(strategistCoachSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const body = await apiFetch<Record<string, object>>(
      '/api/admin/pipelines/strategist',
      {
        method: 'POST',
        body: JSON.stringify({
          pipelineId: `COACH-${Date.now()}`,
          slug: data.slug,
          context: {
            coachingType: data.coachingType,
            targetCompany: data.targetCompany,
            targetRole: data.targetRole,
            resumeId: data.resumeId,
          },
        }),
      },
    )

    return body
  })

/**
 * Triggers a new applications analysis pipeline (Research → Applications) via admin-api.
 *
 * @param data.jobDescription - Job description
 * @param data.targetCompany - Target company
 * @param data.targetRole - Target role
 * @param data.interviewStage - Current interview stage
 * @param data.resumeId - Optional specific resume ID
 * @param data.includeCoverLetter - Whether to generate cover letter
 * @returns Trigger response with pipelineId and slug
 */
export const triggerApplicationsAnalysisFn = createServerFn({ method: 'POST' })
  .inputValidator(analyseTriggerSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const body = await apiFetch<TriggerResponse>(
      '/api/admin/pipelines/strategist',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )

    return body
  })
