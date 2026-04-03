/**
 * Admin Pipeline Action API
 *
 * POST /api/admin/pipeline-action — Invokes the Publish Lambda to
 * approve or reject a reviewed article.
 *
 * Actions:
 *   - approve: Copies review/{slug}.mdx → published/{slug}.mdx,
 *              updates DynamoDB to published, triggers ISR revalidation
 *   - reject:  Copies review/{slug}.mdx → archived/{slug}.mdx,
 *              updates DynamoDB to rejected
 *
 * Env vars:
 *   - PUBLISH_LAMBDA_ARN: ARN of the Publish Lambda function
 *   - AWS_REGION:         AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { auth } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Publish Lambda ARN — injected by deploy.py from SSM at deploy time */
const PUBLISH_LAMBDA_ARN = process.env.PUBLISH_LAMBDA_ARN || ''

// ---------------------------------------------------------------------------
// Singleton AWS client
// ---------------------------------------------------------------------------

let _lambda: LambdaClient | null = null

/** @returns Shared Lambda client */
function getLambda(): LambdaClient {
  _lambda ??= new LambdaClient({ region: REGION })
  return _lambda
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Valid pipeline actions */
type PipelineAction = 'approve' | 'reject'

/** Expected request body */
interface PipelineActionRequestBody {
  readonly slug: string
  readonly action: PipelineAction
}

/** Successful response payload */
interface PipelineActionSuccessResponse {
  readonly success: true
  readonly slug: string
  readonly action: PipelineAction
  readonly message: string
}

/** Error response payload */
interface PipelineActionErrorResponse {
  readonly success: false
  readonly slug: string
  readonly message: string
  readonly error: string
}

type PipelineActionResponse = PipelineActionSuccessResponse | PipelineActionErrorResponse

/** Valid pipeline actions set for validation */
const VALID_ACTIONS: ReadonlySet<string> = new Set(['approve', 'reject'])

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/pipeline-action
 *
 * Invokes the Publish Lambda with the specified action.
 *
 * @param request - JSON body with `slug` and `action`
 * @returns JSON indicating the action result
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<PipelineActionResponse | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  // Parse and validate request body
  let body: PipelineActionRequestBody
  try {
    body = (await request.json()) as PipelineActionRequestBody
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

  if (!body.action || !VALID_ACTIONS.has(body.action)) {
    return NextResponse.json(
      { error: `Invalid action: "${body.action}". Must be "approve" or "reject".` },
      { status: 400 },
    )
  }

  // Validate env vars
  if (!PUBLISH_LAMBDA_ARN) {
    console.error('[pipeline-action] Missing PUBLISH_LAMBDA_ARN env var')
    return NextResponse.json(
      { error: 'Server misconfiguration: PUBLISH_LAMBDA_ARN must be set' },
      { status: 500 },
    )
  }

  try {
    const { slug, action } = body

    console.log(`[pipeline-action] Invoking Publish Lambda: ${action} for "${slug}"`)

    const payload = JSON.stringify({ slug, action })

    const result = await getLambda().send(
      new InvokeCommand({
        FunctionName: PUBLISH_LAMBDA_ARN,
        Payload: new TextEncoder().encode(payload),
        InvocationType: 'RequestResponse',
      }),
    )

    // Check for Lambda-level errors
    if (result.FunctionError) {
      const errorPayload = result.Payload
        ? JSON.parse(new TextDecoder().decode(result.Payload)) as { errorMessage?: string }
        : { errorMessage: 'Unknown Lambda error' }

      console.error(
        `[pipeline-action] ❌ Lambda error for "${slug}":`,
        errorPayload.errorMessage,
      )

      return NextResponse.json(
        {
          success: false,
          slug,
          message: `Publish Lambda returned an error`,
          error: errorPayload.errorMessage ?? 'Unknown Lambda error',
        },
        { status: 502 },
      )
    }

    const actionLabel = action === 'approve' ? 'approved and published' : 'rejected'
    console.log(`[pipeline-action] ✅ Article "${slug}" ${actionLabel}`)

    return NextResponse.json({
      success: true,
      slug,
      action,
      message: `Article "${slug}" has been ${actionLabel}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[pipeline-action] ❌ Failed action for "${body.slug}":`, message)

    return NextResponse.json(
      {
        success: false,
        slug: body.slug,
        message: 'Failed to execute pipeline action',
        error: message,
      },
      { status: 500 },
    )
  }
}
