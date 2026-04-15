/**
 * @format
 * Draft publish server function for the admin dashboard.
 *
 * Uploads a new markdown draft to S3 via the admin-api BFF, which writes it
 * to the `drafts/<slug>.md` key on the assets bucket. The S3 bucket has an
 * event notification configured to invoke the Article Pipeline Trigger Lambda
 * (trigger-handler.ts) automatically — no manual Lambda invocation needed.
 *
 * All operations are delegated to the `admin-api` BFF service:
 * - Draft upload: `POST /api/admin/drafts/:slug` — admin-api writes to S3,
 *   S3 event fires the pipeline trigger Lambda automatically.
 *
 * Protected by JWT authentication via `requireAuth()`.
 *
 * @see admin-api/src/routes/drafts.ts                            — draft upload endpoint
 * @see bedrock-applications/article-pipeline/src/handlers/trigger-handler.ts — S3 event handler
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
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
 * @param path - Full path on admin-api (e.g. `/api/admin/content/draft`)
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

/**
 * Derives a URL-safe slug from a filename.
 *
 * @param fileName - Raw filename (e.g. `my-article.md`)
 * @returns Slugified base without extension
 */
function deriveSlug(fileName: string): string {
  return fileName
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// =============================================================================
// Input Schema
// =============================================================================

const publishDraftSchema = z.object({
  fileName: z.string().min(1, 'Filename is required'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
})

// =============================================================================
// Response Type
// =============================================================================

interface PublishDraftResult {
  readonly success: boolean
  readonly slug: string
  readonly message: string
  readonly error?: string
}

// =============================================================================
// Server Function
// =============================================================================

/**
 * Uploads a markdown draft to S3 via admin-api and lets the S3 event
 * notification fire the article pipeline trigger Lambda automatically.
 *
 * Flow:
 *   1. Derives a slug from the filename (local — no network required)
 *   2. Uploads draft to `POST /api/admin/drafts/:slug` on admin-api,
 *      which writes `drafts/<slug>.md` to the assets S3 bucket.
 *   3. Returns the slug for frontend pipeline tracking.
 *      (The S3 event notification → trigger Lambda → Step Functions
 *       chain runs asynchronously in the background.)
 *
 * @param data.fileName - Draft filename (e.g. `my-article.md`)
 * @param data.content - Raw markdown content
 * @returns Success response with slug for pipeline tracking
 */
export const publishDraftFn = createServerFn({ method: 'POST' })
  .inputValidator(publishDraftSchema)
  .handler(async ({ data }): Promise<PublishDraftResult> => {
    await requireAuth()

    const slug = deriveSlug(data.fileName)

    if (!slug) {
      return {
        success: false,
        slug: '',
        message: 'Invalid filename — could not derive a valid slug',
      }
    }

    try {
      // Upload the draft to S3 at drafts/<slug>.md via the dedicated draft
      // endpoint. The assets bucket has an S3 event notification that fires
      // the article pipeline trigger Lambda automatically on PUT to drafts/*.
      await apiFetch<{ uploaded: boolean; slug: string; key: string }>(
        `/api/admin/drafts/${encodeURIComponent(slug)}`,
        {
          method: 'POST',
          body: JSON.stringify({ content: data.content }),
        },
      )

      return {
        success: true,
        slug,
        message: `Draft "${slug}" uploaded — pipeline triggered!`,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      return {
        success: false,
        slug,
        message: 'Draft upload failed',
        error: message,
      }
    }
  })
