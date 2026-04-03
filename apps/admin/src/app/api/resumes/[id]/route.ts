/**
 * Admin Resume by ID API — Get, Update, Delete
 *
 * GET    /api/admin/resumes/[id] — fetch single resume with content
 * PUT    /api/admin/resumes/[id] — update label + content
 * DELETE /api/admin/resumes/[id] — delete resume version
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isResumeDBConfigured,
  getResume,
  updateResume,
  deleteResume,
} from '@/lib/resumes/dynamodb-resumes'
import type { ResumeData } from '@/lib/resumes/resume-data'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Fetch a single resume by ID with full content.
 *
 * @param _request - Unused request object
 * @param context - Route params containing resume ID
 * @returns Resume with data, or 404
 */
export async function GET(
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
    const resume = await getResume(id)
    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 },
      )
    }
    return NextResponse.json(resume)
  } catch (err) {
    console.error(`[admin/resumes/${id}] Failed to fetch resume:`, err)
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 },
    )
  }
}

/**
 * Update a resume's label and content.
 *
 * @param request - JSON body: { label: string, data: ResumeData }
 * @param context - Route params containing resume ID
 * @returns Updated resume with data
 */
export async function PUT(
  request: NextRequest,
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
    const body = await request.json() as { label?: string; data?: ResumeData }

    if (!body.label || typeof body.label !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: label' },
        { status: 400 },
      )
    }

    if (!body.data || typeof body.data !== 'object') {
      return NextResponse.json(
        { error: 'Missing required field: data (ResumeData object)' },
        { status: 400 },
      )
    }

    const resume = await updateResume(id, body.label, body.data)
    return NextResponse.json(resume)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`[admin/resumes/${id}] Failed to update resume:`, err)
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 },
    )
  }
}

/**
 * Delete a resume version.
 *
 * @param _request - Unused request object
 * @param context - Route params containing resume ID
 * @returns 204 No Content on success
 */
export async function DELETE(
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
    await deleteResume(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('active')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error(`[admin/resumes/${id}] Failed to delete resume:`, err)
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 },
    )
  }
}
