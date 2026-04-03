/**
 * Admin Article Metadata API — Partial Update
 *
 * PATCH /api/admin/articles/metadata — updates specific metadata
 * fields on an article in DynamoDB (e.g. githubUrl).
 *
 * Request body: { slug: string, updates: { githubUrl?: string | null } }
 *
 * Setting a field to null clears it from DynamoDB.
 * Only allowlisted fields are accepted (see UpdatableArticleMetadata).
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { auth } from '@/lib/auth'
import {
  isDynamoDBConfigured,
  updateArticleMetadata,
} from '@/lib/articles/dynamodb-articles'

import type { UpdatableArticleMetadata } from '@/lib/articles/dynamodb-articles'

/** Request body schema */
interface MetadataUpdateRequestBody {
  readonly slug: string
  readonly updates: UpdatableArticleMetadata
}

/**
 * Partially updates article metadata fields.
 *
 * @param request - Must contain JSON body with `slug` and `updates` fields
 * @returns Updated article metadata on success
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  // Parse and validate request body
  let body: MetadataUpdateRequestBody
  try {
    body = (await request.json()) as MetadataUpdateRequestBody
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

  if (!body.updates || typeof body.updates !== 'object') {
    return NextResponse.json(
      { error: 'Missing required field: updates' },
      { status: 400 },
    )
  }

  // Validate githubUrl format if provided
  if (body.updates.githubUrl !== undefined && body.updates.githubUrl !== null) {
    try {
      new URL(body.updates.githubUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid GitHub URL format — must be a full URL (e.g. https://github.com/...)' },
        { status: 400 },
      )
    }
  }

  const slug = body.slug.trim()

  try {
    const article = await updateArticleMetadata(slug, body.updates)
    console.log(`[admin/articles] Updated metadata for: ${slug}`, body.updates)

    // Bust ISR caches so the updated metadata appears immediately
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)

    return NextResponse.json({ article, updated: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[admin/articles] Failed to update metadata for "${slug}":`, message)

    if (message.includes('ConditionalCheckFailed') || message.includes('not found')) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: 'Failed to update article metadata' },
      { status: 500 },
    )
  }
}
