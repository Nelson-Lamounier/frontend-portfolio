import { createServerFn } from '@tanstack/react-start'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const REGION = process.env.AWS_REGION || 'eu-west-1'
const PRODUCTION_DOMAIN = 'https://nelsonlamounier.com'

const MAX_FILE_SIZE = 50 * 1024 * 1024

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXTENSION))

let _s3Client: S3Client | null = null
function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({ region: REGION })
  }
  return _s3Client
}

function deriveExtension(mimeType: string): string {
  const ext = MIME_TO_EXTENSION[mimeType]
  if (!ext) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed: ${Object.keys(MIME_TO_EXTENSION).join(', ')}`,
    )
  }
  return ext
}

export const uploadMediaFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    if (!ASSETS_BUCKET_NAME) {
      throw new Error('ASSETS_BUCKET_NAME is not configured')
    }

    const formData = ctx.data

    if (!(formData instanceof FormData)) {
      throw new Error('Expected FormData payload')
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
