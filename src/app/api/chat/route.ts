/**
 * @format
 * Chat API Route
 *
 * Server-side proxy for the Bedrock Agent API Gateway.
 * Keeps the API Key hidden from the browser — it is injected
 * from the `BEDROCK_AGENT_API_KEY` environment variable.
 *
 * Endpoint: POST /api/chat
 * Body:     { prompt: string, sessionId?: string }
 * Returns:  { message: string, sessionId: string }
 */

import { type NextRequest, NextResponse } from 'next/server'

import type { ChatErrorResponse, ChatRequest, ChatResponse } from '@/lib/types/chat.types'

// =============================================================================
// ENVIRONMENT
// =============================================================================

const AGENT_API_URL = process.env.BEDROCK_AGENT_API_URL
const AGENT_API_KEY = process.env.BEDROCK_AGENT_API_KEY

/**
 * Maximum prompt length — mirrors API Gateway request model validation.
 */
const MAX_PROMPT_LENGTH = 10_000

/**
 * Request timeout for the upstream Bedrock call (ms).
 * The invoke Lambda has a 60s timeout; add headroom.
 */
const UPSTREAM_TIMEOUT_MS = 65_000

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/chat — Proxy a chat prompt to the Bedrock Agent.
 *
 * @param request - Incoming Next.js request with JSON body
 * @returns JSON response with the agent's reply and session ID
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse | ChatErrorResponse>> {
  // ── Guard: missing env vars ──────────────────────────────────────────────
  if (!AGENT_API_URL || !AGENT_API_KEY) {
    console.error('[chat] Missing BEDROCK_AGENT_API_URL or BEDROCK_AGENT_API_KEY')
    return NextResponse.json(
      { error: 'Chat service is not configured.', code: 'AGENT_ERROR' as const },
      { status: 503 },
    )
  }

  // ── Parse & validate body ────────────────────────────────────────────────
  let body: ChatRequest

  try {
    body = (await request.json()) as ChatRequest
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.', code: 'VALIDATION_ERROR' as const },
      { status: 400 },
    )
  }

  const prompt = body.prompt?.trim()

  if (!prompt || prompt.length === 0) {
    return NextResponse.json(
      { error: 'Prompt is required.', code: 'VALIDATION_ERROR' as const },
      { status: 400 },
    )
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      {
        error: `Prompt must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`,
        code: 'VALIDATION_ERROR' as const,
      },
      { status: 400 },
    )
  }

  // ── Forward to Bedrock Agent API Gateway ─────────────────────────────────
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    const upstreamBody: Record<string, string> = { prompt }
    if (body.sessionId) {
      upstreamBody.sessionId = body.sessionId
    }

    const upstream = await fetch(AGENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AGENT_API_KEY,
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    // ── Handle non-2xx from API Gateway ──────────────────────────────────
    if (!upstream.ok) {
      const status = upstream.status

      if (status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED' as const },
          { status: 429 },
        )
      }

      // Attempt to extract error detail from upstream
      let detail = 'The agent could not process your request.'
      try {
        const errBody = (await upstream.json()) as Record<string, unknown>
        if (typeof errBody.message === 'string') detail = errBody.message
      } catch {
        // swallow — use default detail
      }

      console.error(`[chat] Upstream ${status}: ${detail}`)

      return NextResponse.json(
        { error: detail, code: 'AGENT_ERROR' as const },
        { status: status >= 500 ? 502 : status },
      )
    }

    // ── Success — return agent response ──────────────────────────────────
    const data = (await upstream.json()) as Record<string, unknown>

    const response: ChatResponse = {
      message: typeof data.message === 'string' ? data.message :
               typeof data.response === 'string' ? data.response :
               typeof data.body === 'string' ? data.body :
               'I received your message but could not parse the response.',
      sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
    }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[chat] Upstream timeout')
      return NextResponse.json(
        { error: 'The agent took too long to respond. Please try again.', code: 'NETWORK_ERROR' as const },
        { status: 504 },
      )
    }

    console.error('[chat] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.', code: 'AGENT_ERROR' as const },
      { status: 500 },
    )
  }
}
