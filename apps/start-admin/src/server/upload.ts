/**
 * @format
 * Media upload server function for the admin dashboard.
 *
 * All upload operations are delegated to the `admin-api` BFF service via
 * the pre-signed URL pattern: admin-api generates a signed S3 PUT URL,
 * and the binary content is uploaded directly from the pod to S3.
 *
 * This avoids routing binary content through the Kubernetes pod, reducing
 * memory pressure and upload latency.
 *
 * Protected by JWT authentication via `requireAuth()`.
 *
 * @see admin-api/src/routes/assets.ts — upstream presign + delete implementation
 */

import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { requireAuth } from './auth-guard'
import { z } from 'zod'

// =============================================================================
// Constants
// =============================================================================

const ADMIN_API_URL =
  process.env['ADMIN_API_URL'] ?? 'http://admin-api.admin-api:3002'

const PRODUCTION_DOMAIN = 'https://nelsonlamounier.com'

/** Maximum upload size: 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set(Object.keys(MIME_TO_EXTENSION))

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
 * @param path - Full path on admin-api (e.g. `/api/admin/assets/presign`)
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
 * Maps a MIME type to its file extension.
 *
 * @param mimeType - The MIME type to look up
 * @returns File extension string
 * @throws {TypeError} If the MIME type is not in the allow list
 */
function deriveExtension(mimeType: string): string {
  const ext = MIME_TO_EXTENSION[mimeType]
  if (!ext) {
    throw new TypeError(
      `Unsupported file type: ${mimeType}. Allowed: ${Object.keys(MIME_TO_EXTENSION).join(', ')}`,
    )
  }
  return ext
}

// =============================================================================
// Schemas
// =============================================================================

/** Validate that the incoming payload is a FormData instance */
const formDataSchema = z.instanceof(FormData)

// =============================================================================
// Server Function
// =============================================================================

/**
 * Uploads a media file (image or video) to S3 via admin-api pre-signed URLs.
 *
 * Flow:
 *   1. Validates the file type and size locally
 *   2. Requests a pre-signed PUT URL from admin-api
 *   3. Uploads the binary directly to S3 using the signed URL
 *   4. Returns the public CDN URL and S3 key
 *
 * Receives a `FormData` payload with:
 * - `file` — The binary file
 * - `id` (optional) — A deterministic ID for content-addressed storage
 *
 * @returns Upload result with the public URL and S3 key
 */
export const uploadMediaFn = createServerFn({ method: 'POST' })
  .inputValidator(formDataSchema)
  .handler(async ({ data: formData }) => {
    await requireAuth()

    const file = formData.get('file') as File | null
    const id = formData.get('id') as string | null

    if (!file) {
      throw new Error('No file uploaded')
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error(
        `Unsupported file type: ${file.type}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum: 50 MB`,
      )
    }

    const ext = deriveExtension(file.type)
    const isVideo = file.type.startsWith('video/')
    const folder = isVideo ? 'videos/articles' : 'images/articles'

    let s3Key: string
    if (id) {
      const safeId = id.replaceAll(/[^a-z0-9-]/gi, '-').toLowerCase()
      s3Key = `${folder}/${safeId}.${ext}`
    } else {
      const safeName = file.name.replaceAll(/[^a-zA-Z0-9.-]/g, '_')
      s3Key = `${folder}/${Date.now()}-${safeName}`
    }

    // Step 1: Request a pre-signed PUT URL from admin-api
    const presignResponse = await apiFetch<{
      url: string
      key: string
      expiresIn: number
    }>('/api/admin/assets/presign', {
      method: 'POST',
      body: JSON.stringify({
        key: s3Key,
        contentType: file.type,
        contentLength: file.size,
      }),
    })

    // Step 2: Upload binary directly to S3 using the signed URL
    const uploadRes = await fetch(presignResponse.url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-Length': String(file.size),
      },
      body: await file.arrayBuffer(),
    })

    if (!uploadRes.ok) {
      throw new Error(`S3 direct upload failed [${uploadRes.status}]: ${uploadRes.statusText}`)
    }

    const absoluteUrl = `${PRODUCTION_DOMAIN}/${presignResponse.key}`

    return {
      success: true,
      url: absoluteUrl,
      key: presignResponse.key,
      id: id ?? undefined,
    }
  })
