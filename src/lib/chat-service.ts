/**
 * @format
 * Chat Service
 *
 * Client-side service for communicating with the Bedrock Agent
 * via the `/api/chat` proxy route. Manages session state for
 * multi-turn conversations.
 */

import type { ChatErrorResponse, ChatResponse } from '@/lib/types/chat.types'

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Result of a chat request — either a successful response or an error.
 */
export type ChatResult =
  | { ok: true; data: ChatResponse }
  | { ok: false; error: ChatErrorResponse }

/**
 * Send a prompt to the Bedrock Agent via the server-side proxy.
 *
 * @param prompt    - The user's message text
 * @param sessionId - Optional session ID for conversation continuity
 * @returns A discriminated union indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await sendChatMessage('Tell me about this portfolio')
 * if (result.ok) {
 *   console.log(result.data.message)
 *   // Store result.data.sessionId for follow-up messages
 * } else {
 *   console.error(result.error.error)
 * }
 * ```
 */
export async function sendChatMessage(
  prompt: string,
  sessionId?: string,
): Promise<ChatResult> {
  try {
    const body: Record<string, string> = { prompt }
    if (sessionId) {
      body.sessionId = sessionId
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ChatErrorResponse
      return { ok: false, error: errorData }
    }

    const data = (await response.json()) as ChatResponse
    return { ok: true, data }
  } catch {
    return {
      ok: false,
      error: {
        error: 'Unable to reach the chat service. Please check your connection.',
        code: 'NETWORK_ERROR',
      },
    }
  }
}
