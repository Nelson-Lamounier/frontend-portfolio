import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME || ''
const REGION = process.env.AWS_REGION || 'eu-west-1'
const PRODUCTION_DOMAIN = 'https://nelsonlamounier.com'

// Singleton S3 Client
let _s3Client: S3Client | null = null
function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({ region: REGION })
  }
  return _s3Client
}

/**
 * POST /api/admin/upload
 * 
 * Securely uploads a dynamic image file directly to the S3 bucket.
 * The Next.js IAM Role requires s3:PutObject permissions via CDK.
 * 
 * @param request - multipart/form-data with a 'file' payload
 * @returns JSON with the absolute CloudFront optimized URL of the uploaded image
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 }
    )
  }

  if (!ASSETS_BUCKET_NAME) {
    return NextResponse.json(
      { error: 'ASSETS_BUCKET_NAME is not configured' },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Determine file type category (image vs video) for S3 prefix partitioning
    const isVideo = file.type.startsWith('video/')
    const folderPrefix = isVideo ? 'videos/uploads' : 'images/uploads'

    // Sanitize filename and create a unique S3 object key
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueKey = `${folderPrefix}/${Date.now()}-${safeName}`

    const s3Client = getS3Client()
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: uniqueKey,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      })
    )

    // Build absolute URL mapped to the CloudFront S3 edge topology
    const absoluteUrl = `${PRODUCTION_DOMAIN}/${uniqueKey}`

    return NextResponse.json({ 
      success: true, 
      url: absoluteUrl,
      key: uniqueKey 
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[admin/upload] S3 PutObjectCommand failed:', message)
    return NextResponse.json(
      { error: 'Failed to upload image to S3' },
      { status: 500 }
    )
  }
}
