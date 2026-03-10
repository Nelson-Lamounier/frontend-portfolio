/**
 * POST /api/revalidate
 *
 * On-demand ISR revalidation endpoint.
 * Called by the Bedrock Lambda after publishing a new article to
 * immediately purge the Next.js cache for both the article listing
 * and the specific article detail page.
 *
 * Usage:
 *   curl -X POST http://localhost:3001/api/revalidate \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"<REVALIDATION_SECRET>","slug":"my-new-article"}'
 *
 * Body:
 *   - secret (required): Must match REVALIDATION_SECRET env var
 *   - slug   (optional): Specific article slug to revalidate.
 *                         If omitted, only the listing page is purged.
 */

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RevalidateBody {
  secret?: string
  slug?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RevalidateBody

    // ── Auth guard ──────────────────────────────────────
    const expectedSecret = process.env.REVALIDATION_SECRET
    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'REVALIDATION_SECRET is not configured' },
        { status: 500 },
      )
    }

    if (body.secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 },
      )
    }

    // ── Revalidate paths ────────────────────────────────
    const revalidated: string[] = []

    // Always revalidate the articles listing
    revalidatePath('/articles')
    revalidated.push('/articles')

    // Optionally revalidate a specific article
    if (body.slug) {
      const articlePath = `/articles/${body.slug}`
      revalidatePath(articlePath)
      revalidated.push(articlePath)
    }

    // Also revalidate the home page (it shows recent articles)
    revalidatePath('/')
    revalidated.push('/')

    console.log('[revalidate] Paths purged:', revalidated)

    return NextResponse.json({
      revalidated: true,
      paths: revalidated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[revalidate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 },
    )
  }
}
