/**
 * Strategist Analysis API — Lambda Invocation
 *
 * POST /api/admin/strategist/trigger
 *
 * Invokes the Strategist Trigger Lambda with `operation: 'analyse'`.
 * The Lambda routes internally to the Analysis State Machine
 * (Research → Strategist → AnalysisPersist).
 *
 * Env vars (injected by deploy.py via K8s secret):
 *   - STRATEGIST_TRIGGER_ARN: Trigger Lambda function ARN
 *   - AWS_REGION: AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { auth } from '@/lib/auth'
import type { AnalyseTriggerBody, TriggerResponse } from '@/lib/types/strategist.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Trigger Lambda ARN — injected from SSM parameter `strategist-trigger-function-arn` */
const TRIGGER_ARN = process.env.STRATEGIST_TRIGGER_ARN || ''

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

/** Minimum length for job description text */
const MIN_JD_LENGTH = 50

/** Maximum length for job description text */
const MAX_JD_LENGTH = 15_000

/**
 * Validates the trigger request body.
 *
 * @param body - Parsed request body
 * @returns Error message string, or null if valid
 */
function validateBody(body: Partial<AnalyseTriggerBody>): string | null {
  if (!body.jobDescription || typeof body.jobDescription !== 'string') {
    return 'Missing required field: jobDescription'
  }
  if (body.jobDescription.length < MIN_JD_LENGTH) {
    return `jobDescription must be at least ${MIN_JD_LENGTH} characters`
  }
  if (body.jobDescription.length > MAX_JD_LENGTH) {
    return `jobDescription must not exceed ${MAX_JD_LENGTH} characters`
  }
  if (!body.targetCompany || typeof body.targetCompany !== 'string') {
    return 'Missing required field: targetCompany'
  }
  if (!body.targetRole || typeof body.targetRole !== 'string') {
    return 'Missing required field: targetRole'
  }
  if (body.resumeId !== undefined && typeof body.resumeId !== 'string') {
    return 'resumeId must be a string when provided'
  }
  if (body.includeCoverLetter !== undefined && typeof body.includeCoverLetter !== 'boolean') {
    return 'includeCoverLetter must be a boolean when provided'
  }
  return null
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/strategist/trigger
 *
 * Invokes the Trigger Lambda with `operation: 'analyse'` and the provided
 * job description, target company, target role, and optional resume version.
 * The Lambda starts the Analysis State Machine and returns the execution
 * details for subsequent DynamoDB-based status polling.
 *
 * @param request - JSON body matching AnalyseTriggerBody
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
    console.error('[strategist-trigger] Missing STRATEGIST_TRIGGER_ARN env var')
    return NextResponse.json(
      { error: 'Server misconfiguration: STRATEGIST_TRIGGER_ARN must be set' },
      { status: 500 },
    )
  }

  // Parse and validate request body
  let body: AnalyseTriggerBody
  try {
    body = (await request.json()) as AnalyseTriggerBody
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
      `[strategist-trigger] Invoking Trigger Lambda (analyse) for ${body.targetCompany} — ${body.targetRole}`,
      body.resumeId ? `(resume: ${body.resumeId})` : '(active resume)',
    )

    const command = new InvokeCommand({
      FunctionName: TRIGGER_ARN,
      InvocationType: 'RequestResponse',
      Payload: new TextEncoder().encode(
        JSON.stringify({
          body: JSON.stringify({
            operation: 'analyse',
            jobDescription: body.jobDescription,
            targetCompany: body.targetCompany.trim(),
            targetRole: body.targetRole.trim(),
            ...(body.resumeId ? { resumeId: body.resumeId } : {}),
            includeCoverLetter: body.includeCoverLetter ?? true,
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
      console.error('[strategist-trigger] Lambda error:', errorPayload)
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

    if (responsePayload.statusCode && responsePayload.statusCode >= 400) {
      let errorMessage = 'Lambda trigger failed'
      try {
        const parsed = JSON.parse(responsePayload.body)
        errorMessage = parsed.error || errorMessage
      } catch {
        errorMessage = responsePayload.body
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: responsePayload.statusCode },
      )
    }

    const triggerResponse = JSON.parse(responsePayload.body) as TriggerResponse

    console.log(
      `[strategist-trigger] ✅ Analysis pipeline started: ${triggerResponse.pipelineId}`,
    )

    return NextResponse.json(triggerResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[strategist-trigger] ❌ Failed:', message)
    return NextResponse.json(
      { error: `Failed to invoke Trigger Lambda: ${message}` },
      { status: 500 },
    )
  }
}
