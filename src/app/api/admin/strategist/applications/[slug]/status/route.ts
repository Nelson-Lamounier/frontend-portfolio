/**
 * Strategist Status Update API
 *
 * PATCH /api/admin/strategist/applications/[slug]/status
 *
 * Updates the lifecycle status (and optionally interview stage) of an
 * application's METADATA record in DynamoDB. Also updates the GSI1
 * keys to reflect the new status for listing queries.
 *
 * Env vars:
 *   - STRATEGIST_TABLE_NAME: DynamoDB table name
 *   - AWS_REGION: AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { auth } from '@/lib/auth'
import type {
  ApplicationStatus,
  StatusUpdateRequest,
  StatusUpdateResponse,
} from '@/lib/types/strategist.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** DynamoDB table name */
const TABLE_NAME = process.env.STRATEGIST_TABLE_NAME || ''

/** Valid application statuses */
const VALID_STATUSES: ReadonlySet<string> = new Set([
  'analysing',
  'analysis-ready',
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
// Route params type
// ---------------------------------------------------------------------------

/** Next.js dynamic route params */
interface RouteParams {
  params: Promise<{ slug: string }>
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * PATCH /api/admin/strategist/applications/[slug]/status
 *
 * Updates the status and optionally the interview stage of a
 * job application. The GSI1 keys are updated atomically.
 *
 * @param request - JSON body with `status` and optional `interviewStage`
 * @param context - Route context with slug param
 * @returns StatusUpdateResponse
 */
export async function PATCH(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse<StatusUpdateResponse | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!TABLE_NAME) {
    console.error('[strategist-status] Missing STRATEGIST_TABLE_NAME env var')
    return NextResponse.json(
      { error: 'Server misconfiguration: STRATEGIST_TABLE_NAME must be set' },
      { status: 500 },
    )
  }

  const { slug } = await context.params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { error: 'Missing slug parameter' },
      { status: 400 },
    )
  }

  // Parse and validate request body
  let body: StatusUpdateRequest
  try {
    body = (await request.json()) as StatusUpdateRequest
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (!body.status || !VALID_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: `Invalid status: ${body.status}` },
      { status: 400 },
    )
  }

  try {
    const now = new Date().toISOString()
    const datePrefix = now.slice(0, 10) // YYYY-MM-DD

    // Build update expression
    const updateExprParts = [
      '#st = :status',
      'updatedAt = :now',
      'gsi1pk = :gsi1pk',
      'gsi1sk = :gsi1sk',
    ]
    const expressionValues: Record<string, unknown> = {
      ':status': body.status,
      ':now': now,
      ':gsi1pk': `APP_STATUS#${body.status}`,
      ':gsi1sk': `${datePrefix}#${slug}`,
    }
    const expressionNames: Record<string, string> = {
      '#st': 'status',
    }

    // Optionally update interview stage
    if (body.interviewStage) {
      updateExprParts.push('interviewStage = :stage')
      expressionValues[':stage'] = body.interviewStage
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `APPLICATION#${slug}`,
        sk: 'METADATA',
      },
      UpdateExpression: `SET ${updateExprParts.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW',
    })

    await getDocClient().send(command)

    const stageSuffix = body.interviewStage ? ` (${body.interviewStage})` : ''
    console.log(
      `[strategist-status] ✅ Updated "${slug}" → ${body.status}${stageSuffix}`,
    )

    return NextResponse.json({
      success: true,
      status: body.status as ApplicationStatus,
      message: `Status updated to ${body.status}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[strategist-status] ❌ Failed for "${slug}":`, message)
    return NextResponse.json(
      { error: `Failed to update status: ${message}` },
      { status: 500 },
    )
  }
}
