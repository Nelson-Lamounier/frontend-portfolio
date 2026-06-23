/**
 * @format
 * Chat API Route — in-cluster BFF proxy
 *
 * Server-side proxy to the `public-api` BFF running in the EKS cluster.
 * public-api owns the Bedrock API key (Secrets Manager) and forwards to the
 * session-aware RAG Lambda. The portfolio holds no Bedrock credentials.
 *
 * Endpoint: POST /api/chat
 * Body:     { prompt: string, sessionId?: string }
 * Returns:  { message: string, sessionId: string }
 *
 * Upstream: POST {PUBLIC_API_URL}/api/chatbot/authenticated
 *   accepts { prompt, sessionId?, callerRole? }
 *   returns { response, sessionId }  (errors: { error, message })
 *
 * Session continuity (chat_sessions / chat_messages) is persisted in RDS by
 * public-api / the chatbot-authenticated Lambda — the sessionId returned here
 * must be echoed back on the next turn.
 */

import { type NextRequest, NextResponse } from 'next/server'

import type { ChatErrorResponse, ChatRequest, ChatResponse } from '@/lib/types/chat.types'

// =============================================================================
// CONFIGURATION
// =============================================================================

/** In-cluster public-api BFF base URL (Kubernetes service DNS). */
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://public-api.public-api:3001'

/** Session-aware RAG endpoint on public-api. */
const CHAT_ENDPOINT = '/api/chatbot/authenticated'

/** Maximum prompt length — mirrors public-api / API Gateway request validation. */
const MAX_PROMPT_LENGTH = 10_000

/**
 * Request timeout for the upstream call (ms).
 * public-api aborts its own upstream at 27s; add headroom so we surface its
 * structured error rather than racing it.
 */
const UPSTREAM_TIMEOUT_MS = 30_000

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/chat — proxy a chat prompt to the in-cluster public-api BFF.
 *
 * @param request - Incoming Next.js request with JSON body
 * @returns JSON response with the agent's reply and session ID
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse | ChatErrorResponse>> {
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

  // ── Forward to public-api (in-cluster) ───────────────────────────────────
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    const upstreamBody: Record<string, string> = { prompt }
    if (body.sessionId) {
      upstreamBody.sessionId = body.sessionId
    }

    const upstream = await fetch(`${PUBLIC_API_URL}${CHAT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    // ── Non-2xx from public-api ──────────────────────────────────────────
    if (!upstream.ok) {
      const status = upstream.status

      // Best-effort extract of public-api's { error, message } envelope.
      let detail = 'The chatbot could not process your request.'
      try {
        const errBody = (await upstream.json()) as Record<string, unknown>
        if (typeof errBody.message === 'string') detail = errBody.message
      } catch {
        // swallow — keep default detail
      }

      if (status === 429) {
        return NextResponse.json(
          { error: detail, code: 'RATE_LIMITED' as const },
          { status: 429 },
        )
      }

      console.error(`[chat] public-api ${status}: ${detail}`)

      return NextResponse.json(
        { error: detail, code: 'AGENT_ERROR' as const },
        { status },
      )
    }

    // ── Success — normalise { response } → { message } ───────────────────
    const data = (await upstream.json()) as Record<string, unknown>

    const response: ChatResponse = {
      message:
        typeof data.response === 'string' ? data.response :
        typeof data.message === 'string' ? data.message :
        'I received your message but could not parse the response.',
      sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
    }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[chat] public-api timeout')
      return NextResponse.json(
        { error: 'The chatbot took too long to respond. Please try again.', code: 'NETWORK_ERROR' as const },
        { status: 504 },
      )
    }

    if (err instanceof TypeError) {
      console.error('[chat] public-api network error:', err)
      return NextResponse.json(
        { error: 'Unable to reach the chat service.', code: 'NETWORK_ERROR' as const },
        { status: 502 },
      )
    }

    console.error('[chat] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred.', code: 'AGENT_ERROR' as const },
      { status: 500 },
    )
  }
}
