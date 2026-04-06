/**
 * @format
 * Media upload server function for the admin dashboard.
 *
 * Handles file uploads to S3 with MIME type validation,
 * size limits, and content-addressed key derivation.
 * Protected by JWT authentication via `requireAuth()`.
 */

import { createServerFn } from '@tanstack/react-start'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireAuth } from './auth-guard'
import { z } from 'zod'

// =============================================================================
// Constants
// =============================================================================

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const REGION = process.env.AWS_REGION || 'eu-west-1'
const PRODUCTION_DOMAIN = 'https://nelsonlamounier.com'

/** Maximum upload size: 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set(Object.keys(MIME_TO_EXTENSION))

// =============================================================================
// S3 Client (Lazy Singleton)
// =============================================================================

let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
  _s3Client ??= new S3Client({ region: REGION })
  return _s3Client
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Maps a MIME type to its file extension.
 *
 * @param mimeType - The MIME type to look up
 * @returns File extension string
 * @throws If the MIME type is not in the allow list
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
 * Uploads a media file (image or video) to S3.
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

    if (!ASSETS_BUCKET_NAME) {
      throw new Error('ASSETS_BUCKET_NAME is not configured')
    }

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

    const buffer = Buffer.from(await file.arrayBuffer())
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

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=86400, must-revalidate',
      }),
    )

    const absoluteUrl = `${PRODUCTION_DOMAIN}/${s3Key}`

    return {
      success: true,
      url: absoluteUrl,
      key: s3Key,
      id: id || undefined,
    }
  })

