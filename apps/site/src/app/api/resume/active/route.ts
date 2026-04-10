/**
 * Public Active Resume API — Site Proxy
 *
 * GET /api/resume/active
 *
 * Public endpoint (no auth required). Proxies to the `public-api` BFF
 * service which owns the resume data access layer. Falls back to 204 if
 * the upstream is unreachable or returns no active resume.
 *
 * The site pod requires no direct DynamoDB access for this route.
 * All data ownership for resume entities now lives in public-api.
 */

import { NextResponse } from 'next/server'

const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://public-api.public-api:3001'

/**
 * Fetch the publicly displayed resume by proxying to public-api.
 *
 * @returns Active resume data, or 204 if no active resume is configured
 */
export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/api/resumes/active`, {
      next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
    })

    if (!res.ok) {
      // public-api returns 204 when no active resume is set
      if (res.status === 204) {
        return new NextResponse(null, { status: 204 })
      }
      console.error(`[resume/active] upstream returned ${res.status}`)
      return new NextResponse(null, { status: 204 })
    }

    const data: unknown = await res.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    console.error('[resume/active] Failed to reach public-api:', err)
    // Return 204 on error — frontend falls back to hardcoded data
    return new NextResponse(null, { status: 204 })
  }
}
