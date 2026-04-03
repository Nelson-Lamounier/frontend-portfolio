/**
 * Admin Resumes API — List + Create
 *
 * GET  /api/admin/resumes — returns all resume versions
 * POST /api/admin/resumes — creates a new resume version
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import {
  isResumeDBConfigured,
  listResumes,
  createResume,
} from '@/lib/resumes/dynamodb-resumes'
import type { ResumeData } from '@/lib/resumes/resume-data'

/**
 * List all resume versions for the admin dashboard.
 *
 * @returns JSON array of resume summaries
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isResumeDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured — set DYNAMODB_TABLE_NAME in .env.local' },
      { status: 503 },
    )
  }

  try {
    const resumes = await listResumes()
    return NextResponse.json(resumes)
  } catch (err) {
    console.error('[admin/resumes] Failed to list resumes:', err)
    return NextResponse.json(
      { error: 'Failed to list resumes' },
      { status: 500 },
    )
  }
}

/**
 * Create a new resume version.
 *
 * @param request - JSON body: { label: string, data: ResumeData }
 * @returns Created resume with data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!isResumeDBConfigured()) {
    return NextResponse.json(
      { error: 'DynamoDB is not configured — set DYNAMODB_TABLE_NAME in .env.local' },
      { status: 503 },
    )
  }

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

    const resume = await createResume(body.label, body.data)
    return NextResponse.json(resume, { status: 201 })
  } catch (err) {
    console.error('[admin/resumes] Failed to create resume:', err)
    return NextResponse.json(
      { error: 'Failed to create resume' },
      { status: 500 },
    )
  }
}
