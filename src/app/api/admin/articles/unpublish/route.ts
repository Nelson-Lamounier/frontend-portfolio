/**
 * Admin Articles Unpublish API
 *
 * POST /api/admin/articles/unpublish — transitions an article from
 * 'published' back to 'draft' status in DynamoDB.
 *
 * Request body: { slug: string }
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isDynamoDBConfigured,
  unpublishArticle,
} from '@/lib/dynamodb-articles'

/** Request body schema */
interface UnpublishRequestBody {
  readonly slug: string
}

/**
 * Unpublishes an article by slug (moves back to draft).
 *
 * @param request - Must contain JSON body with `slug` field
 * @returns Updated article metadata on success
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isDynamoDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  let body: UnpublishRequestBody
  try {
    body = (await request.json()) as UnpublishRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: slug' },
      { status: 400 },
    )
  }

  const slug = body.slug.trim()

  try {
    const article = await unpublishArticle(slug)
    console.log(`[admin/articles] Unpublished article: ${slug}`)
    return NextResponse.json({ article, unpublished: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[admin/articles] Failed to unpublish "${slug}":`, message)

    if (message.includes('not found')) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to unpublish article' },
      { status: 500 },
    )
  }
}
