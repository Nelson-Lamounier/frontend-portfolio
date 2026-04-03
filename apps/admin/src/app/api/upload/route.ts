/**
 * Admin Media Upload API
 *
 * POST /api/admin/upload — uploads an image or video to the S3 assets
 * bucket for use in Bedrock-generated MDX articles.
 *
 * Supports two modes:
 * 1. **ID-keyed** (new): Pass `id` matching an `<ImageRequest id="..." />`
 *    or `<VideoRequest id="..." />` tag. The S3 key is deterministic:
 *    `images/articles/{id}.{ext}` or `videos/articles/{id}.{ext}`.
 *    This enables immediate resolution by the frontend component.
 *
 * 2. **Timestamp-keyed** (legacy): No `id` — generates a unique key
 *    using a timestamp prefix: `images/uploads/{ts}-{name}`.
 *
 * Supported formats:
 *   Images: jpeg, png, webp, gif
 *   Videos: mp4, webm
 *
 * Request: multipart/form-data with `file` (required) and `id` (optional)
 * Response: `{ success: true, url: string, key: string }`
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const REGION = process.env.AWS_REGION || 'eu-west-1'
const PRODUCTION_DOMAIN = 'https://nelsonlamounier.com'

/** Maximum upload size: 50 MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * MIME type → file extension mapping for supported media formats.
 *
 * Only allow known-safe formats to prevent arbitrary file uploads.
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

/** Allowed MIME types (derived from the extension map) */
const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXTENSION))

// Singleton S3 Client
let _s3Client: S3Client | null = null
function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({ region: REGION })
  }
  return _s3Client
}

/**
 * Derive a file extension from a MIME type.
 *
 * @param mimeType - The file's MIME type (e.g. 'image/jpeg')
 * @returns The file extension without a leading dot (e.g. 'jpeg')
 * @throws Error if the MIME type is not in the allowed list
 */
function deriveExtension(mimeType: string): string {
  const ext = MIME_TO_EXTENSION[mimeType]
  if (!ext) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed: ${Object.keys(MIME_TO_EXTENSION).join(', ')}`,
    )
  }
  return ext
}

/**
 * POST /api/admin/upload
 *
 * Securely uploads a media file to the S3 assets bucket.
 * The Next.js IAM Role requires s3:PutObject permissions via CDK.
 *
 * @param request - multipart/form-data with `file` (required) and `id` (optional)
 * @returns JSON with the absolute CloudFront URL and S3 key of the uploaded file
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!ASSETS_BUCKET_NAME) {
    return NextResponse.json(
      { error: 'ASSETS_BUCKET_NAME is not configured' },
      { status: 503 },
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const id = formData.get('id') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 },
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum: 50 MB` },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = deriveExtension(file.type)

    // Determine folder based on media type
    const isVideo = file.type.startsWith('video/')
    const folder = isVideo ? 'videos/articles' : 'images/articles'

    // Build S3 key:
    // - With 'id': deterministic key matching ImageRequest/VideoRequest component resolution
    // - Without 'id': timestamp-based unique key (backward compatible)
    let s3Key: string
    if (id) {
      // Sanitise the id: allow only lowercase alphanumeric and hyphens
      const safeId = id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      s3Key = `${folder}/${safeId}.${ext}`
    } else {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      s3Key = `${folder}/${Date.now()}-${safeName}`
    }

    const s3Client = getS3Client()

    await s3Client.send(
      new PutObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        // Admin-uploaded media may be replaced — use short cache with revalidation
        CacheControl: 'public, max-age=86400, must-revalidate',
      }),
    )

    // Build absolute URL mapped to the CloudFront S3 edge topology
    const absoluteUrl = `${PRODUCTION_DOMAIN}/${s3Key}`

    console.log(`[admin/upload] Uploaded ${isVideo ? 'video' : 'image'}: s3://${ASSETS_BUCKET_NAME}/${s3Key}`)

    return NextResponse.json({
      success: true,
      url: absoluteUrl,
      key: s3Key,
      id: id || undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[admin/upload] S3 PutObjectCommand failed:', message)
    return NextResponse.json(
      { error: 'Failed to upload media to S3' },
      { status: 500 },
    )
  }
}
