/**
 * Admin Articles Delete API
 *
 * DELETE /api/admin/articles/delete — removes an article from DynamoDB.
 *
 * Request body: { slug: string }
 * Guarded: only accessible when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server'

import {
  isDynamoDBConfigured,
  deleteArticle,
} from '@/lib/dynamodb-articles'

/** Request body shape */
interface DeleteRequestBody {
  readonly slug: string
}

/**
 * Deletes an article by slug (removes all DynamoDB records).
 *
 * @param request - Must contain JSON body with `slug` field
 * @returns JSON confirmation on success
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Guard: dev-only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin routes are only available in development' },
      { status: 403 },
    )
  }

  if (!isDynamoDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  // Parse body
  let body: DeleteRequestBody
  try {
    body = (await request.json()) as DeleteRequestBody
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
    await deleteArticle(slug)
    console.log(`[admin/articles] Deleted article: ${slug}`)
    return NextResponse.json({ deleted: true, slug })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[admin/articles] Failed to delete "${slug}":`, message)

    if (message.includes('not found')) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 },
    )
  }
}
