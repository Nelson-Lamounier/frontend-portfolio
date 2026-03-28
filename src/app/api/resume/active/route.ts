/**
 * Public Active Resume API
 *
 * GET /api/resume/active — returns the currently active resume data
 *
 * Public endpoint (no auth required). Used by the public-facing
 * ResumePreview component to fetch the resume chosen by the admin.
 *
 * Falls back to an empty 204 if no active resume is set (the
 * frontend then uses hardcoded fallback data).
 */

import { NextResponse } from 'next/server'

import {
  isResumeDBConfigured,
  getActiveResume,
} from '@/lib/resumes/dynamodb-resumes'

/**
 * Fetch the publicly displayed resume.
 *
 * @returns Active resume data, or 204 if no active resume configured
 */
export async function GET(): Promise<NextResponse> {
  if (!isResumeDBConfigured()) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const resume = await getActiveResume()

    if (!resume) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(resume, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    console.error('[resume/active] Failed to fetch active resume:', err)
    // Return 204 on error — frontend falls back to hardcoded data
    return new NextResponse(null, { status: 204 })
  }
}
