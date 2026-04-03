/**
 * Strategist Applications List API
 *
 * GET /api/admin/strategist/applications
 *
 * Lists job applications from DynamoDB, optionally filtered by status.
 * Uses the GSI1 (status-date) index for efficient sorted queries.
 *
 * Query params:
 *   - status: ApplicationStatus | 'all' (default: 'all')
 *
 * Env vars:
 *   - STRATEGIST_TABLE_NAME: DynamoDB table name
 *   - AWS_REGION: AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { auth } from '@/lib/auth'
import type { ApplicationSummary, ApplicationStatus } from '@/lib/types/strategist.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** DynamoDB table name — injected by deploy.py from SSM at deploy time */
const TABLE_NAME = process.env.STRATEGIST_TABLE_NAME || ''

/** GSI1 index name */
const GSI1_INDEX = 'gsi1-status-date'

/** Valid application statuses for filtering */
const VALID_STATUSES: ReadonlySet<string> = new Set([
  'analysing',
  'analysis-ready',
  'failed',
  'interview-prep',
  'applied',
  'interviewing',
  'offer-received',
  'accepted',
  'withdrawn',
  'rejected',
])

// ---------------------------------------------------------------------------
// Singleton AWS client
// ---------------------------------------------------------------------------

let _docClient: DynamoDBDocumentClient | null = null

/**
 * Returns a shared DynamoDB Document client instance.
 *
 * @returns DynamoDBDocumentClient singleton
 */
function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const ddbClient = new DynamoDBClient({ region: REGION })
    _docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    })
  }
  return _docClient
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Queries applications by status from GSI1.
 *
 * @param status - The application status to query
 * @returns Array of application summaries
 */
async function queryByStatus(status: string): Promise<ApplicationSummary[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: GSI1_INDEX,
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `APP_STATUS#${status}`,
    },
    ScanIndexForward: false, // Newest first
  })

  const result = await getDocClient().send(command)

  return (result.Items ?? []).map((item) => ({
    slug: String(item['applicationSlug'] ?? item['slug'] ?? ''),
    targetCompany: String(item['targetCompany'] ?? ''),
    targetRole: String(item['targetRole'] ?? ''),
    status: String(item['status'] ?? 'analysing') as ApplicationStatus,
    fitRating: item['fitRating'] as ApplicationSummary['fitRating'],
    recommendation: item['recommendation'] as ApplicationSummary['recommendation'],
    interviewStage: String(item['interviewStage'] ?? 'applied') as ApplicationSummary['interviewStage'],
    costUsd: item['costUsd'] as number | undefined,
    createdAt: String(item['createdAt'] ?? ''),
    updatedAt: String(item['updatedAt'] ?? ''),
  }))
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/strategist/applications
 *
 * Lists applications optionally filtered by status.
 * When status='all', queries all status partitions and merges results.
 *
 * @param request - Request with optional `?status=` query param
 * @returns JSON array of ApplicationSummary
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApplicationSummary[] | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  // Validate infrastructure
  if (!TABLE_NAME) {
    console.error('[strategist-applications] Missing STRATEGIST_TABLE_NAME env var')
    return NextResponse.json(
      { error: 'Server misconfiguration: STRATEGIST_TABLE_NAME must be set' },
      { status: 500 },
    )
  }

  const statusParam = request.nextUrl.searchParams.get('status') ?? 'all'

  try {
    let applications: ApplicationSummary[]

    if (statusParam === 'all') {
      // Query each status partition in parallel and merge
      const statusKeys = [...VALID_STATUSES]
      const results = await Promise.all(
        statusKeys.map((s) => queryByStatus(s)),
      )
      applications = results
        .flat()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } else {
      if (!VALID_STATUSES.has(statusParam)) {
        return NextResponse.json(
          { error: `Invalid status: ${statusParam}` },
          { status: 400 },
        )
      }
      applications = await queryByStatus(statusParam)
    }

    return NextResponse.json(applications)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[strategist-applications] ❌ Failed:', message)
    return NextResponse.json(
      { error: `Failed to list applications: ${message}` },
      { status: 500 },
    )
  }
}
