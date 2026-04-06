/**
 * Strategist Coach API — Lambda Invocation
 *
 * POST /api/admin/strategist/coach
 *
 * Invokes the Strategist Trigger Lambda with `operation: 'coach'`.
 * The Lambda routes internally to the Coaching State Machine
 * (CoachLoader → Coach → CoachPersist).
 *
 * Env vars (injected by deploy.py via K8s secret):
 *   - STRATEGIST_TRIGGER_ARN: Trigger Lambda function ARN (shared entry point)
 *   - AWS_REGION: AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { auth } from '@/lib/auth'
import type { CoachTriggerBody, TriggerResponse } from '@/lib/types/applications.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Trigger Lambda ARN — shared entry point for both analyse and coach operations */
const TRIGGER_ARN = process.env.STRATEGIST_TRIGGER_ARN || ''

/** Valid interview stages for validation */
const VALID_STAGES = new Set([
  'applied',
  'phone-screen',
  'technical',
  'behavioural',
  'system-design',
  'bar-raiser',
  'final',
])

// ---------------------------------------------------------------------------
// Singleton AWS client
// ---------------------------------------------------------------------------

let _lambda: LambdaClient | null = null

/**
 * Returns a shared Lambda client instance.
 *
 * @returns LambdaClient singleton
 */
function getLambda(): LambdaClient {
  _lambda ??= new LambdaClient({ region: REGION })
  return _lambda
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

/**
 * Validates the coach request body.
 *
 * @param body - Parsed request body
 * @returns Error message string, or null if valid
 */
function validateBody(body: Partial<CoachTriggerBody>): string | null {
  if (!body.applicationSlug || typeof body.applicationSlug !== 'string') {
    return 'Missing required field: applicationSlug'
  }
  if (!body.interviewStage || typeof body.interviewStage !== 'string') {
    return 'Missing required field: interviewStage'
  }
  if (!VALID_STAGES.has(body.interviewStage)) {
    return `Invalid interviewStage: "${body.interviewStage}". Expected one of: ${[...VALID_STAGES].join(', ')}`
  }
  return null
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/strategist/coach
 *
 * Invokes the Trigger Lambda with `operation: 'coach'` for a specific
 * interview stage on an existing application. The Lambda starts the
 * Coaching State Machine which loads analysis context from DynamoDB
 * and generates stage-specific interview preparation materials.
 *
 * @param request - JSON body matching CoachTriggerBody
 * @returns TriggerResponse with pipelineId and applicationSlug
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<TriggerResponse | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  // Validate infrastructure env vars
  if (!TRIGGER_ARN) {
    console.error('[strategist-coach] Missing STRATEGIST_TRIGGER_ARN env var')
    return NextResponse.json(
      { error: 'Server misconfiguration: STRATEGIST_TRIGGER_ARN must be set' },
      { status: 500 },
    )
  }

  // Parse and validate request body
  let body: CoachTriggerBody
  try {
    body = (await request.json()) as CoachTriggerBody
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const validationError = validateBody(body)
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 },
    )
  }

  try {
    console.log(
      `[strategist-coach] Invoking Trigger Lambda (coach) for ${body.applicationSlug} — stage: ${body.interviewStage}`,
    )

    const command = new InvokeCommand({
      FunctionName: TRIGGER_ARN,
      InvocationType: 'RequestResponse',
      Payload: new TextEncoder().encode(
        JSON.stringify({
          body: JSON.stringify({
            operation: 'coach',
            applicationSlug: body.applicationSlug,
            interviewStage: body.interviewStage,
          }),
          requestContext: {
            http: { method: 'POST' },
          },
        }),
      ),
    })

    const result = await getLambda().send(command)

    // Parse Lambda response
    if (result.FunctionError) {
      const errorPayload = result.Payload
        ? new TextDecoder().decode(result.Payload)
        : 'Unknown Lambda error'
      console.error('[strategist-coach] Lambda error:', errorPayload)
      return NextResponse.json(
        { error: `Lambda execution failed: ${errorPayload}` },
        { status: 502 },
      )
    }

    const responsePayload = result.Payload
      ? JSON.parse(new TextDecoder().decode(result.Payload)) as {
          statusCode?: number
          body?: string
        }
      : null

    if (!responsePayload?.body) {
      return NextResponse.json(
        { error: 'Empty response from Trigger Lambda' },
        { status: 502 },
      )
    }

    const triggerResponse = JSON.parse(responsePayload.body) as TriggerResponse

    console.log(
      `[strategist-coach] ✅ Coaching pipeline started: ${triggerResponse.pipelineId}`,
    )

    return NextResponse.json(triggerResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[strategist-coach] ❌ Failed:', message)
    return NextResponse.json(
      { error: `Failed to invoke Trigger Lambda: ${message}` },
      { status: 500 },
    )
  }
}
