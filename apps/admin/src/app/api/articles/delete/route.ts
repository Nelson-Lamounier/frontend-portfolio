/**
 * Admin Articles Delete API
 *
 * DELETE /api/admin/articles/delete — removes an article from DynamoDB.
 *
 * Request body: { slug: string }
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { auth } from '@/lib/auth'
import {
  isDynamoDBConfigured,
  deleteArticle,
} from '@/lib/articles/dynamodb-articles'

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

    // Bust Next.js ISR page caches so the deleted article disappears immediately
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)

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
