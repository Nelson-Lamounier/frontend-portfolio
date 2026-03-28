/**
 * Admin Resume Activate API
 *
 * POST /api/admin/resumes/[id]/activate — set this resume as publicly displayed
 *
 * Deactivates the previously active resume and activates this one.
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isResumeDBConfigured,
  setActiveResume,
} from '@/lib/resumes/dynamodb-resumes'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Activate a resume version for public display.
 *
 * @param _request - Unused request object
 * @param context - Route params containing resume ID
 * @returns Activated resume with data
 */
export async function POST(
  _request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isResumeDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured' },
      { status: 503 },
    )
  }

  const { id } = await context.params

  try {
    const resume = await setActiveResume(id)
    return NextResponse.json(resume)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`[admin/resumes/${id}/activate] Failed to activate:`, err)
    return NextResponse.json(
      { error: 'Failed to activate resume' },
      { status: 500 },
    )
  }
}
