/**
 * @format
 * Chat Types
 *
 * TypeScript interfaces for the Bedrock Agent chatbot feature.
 * Covers message models, API request/response contracts, and widget state.
 */

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/**
 * Roles in a chat conversation.
 * - `user`  — the site visitor
 * - `agent` — the Bedrock Agent (Claude 3.5 Haiku + Portfolio KB)
 */
export type ChatRole = 'user' | 'agent'

/**
 * A single message in the conversation history.
 */
export interface ChatMessage {
  /** Unique client-generated identifier */
  readonly id: string
  /** Who sent the message */
  readonly role: ChatRole
  /** Message body text */
  readonly content: string
  /** ISO-8601 timestamp */
  readonly timestamp: string
}

// =============================================================================
// API CONTRACT — matches the Next.js /api/chat route
// =============================================================================

/**
 * Request body sent from the browser to `/api/chat`.
 */
export interface ChatRequest {
  /** The user's prompt text (1–10 000 characters) */
  readonly prompt: string
  /** Optional session ID for multi-turn continuity */
  readonly sessionId?: string
}

/**
 * Successful response from `/api/chat`.
 */
export interface ChatResponse {
  /** The agent's reply text */
  readonly message: string
  /** Session ID to reuse for follow-up messages */
  readonly sessionId: string
}

/**
 * Error response from `/api/chat`.
 */
export interface ChatErrorResponse {
  /** Human-readable error description */
  readonly error: string
  /** Machine-readable error code */
  readonly code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'GUARDRAIL_BLOCKED' | 'AGENT_ERROR' | 'NETWORK_ERROR'
}

// =============================================================================
// WIDGET STATE
// =============================================================================

/**
 * Internal state for the ChatWidget component.
 */
export interface ChatWidgetState {
  /** Whether the chat panel is open */
  readonly isOpen: boolean
  /** Conversation messages */
  readonly messages: ChatMessage[]
  /** Current session ID (set after first agent response) */
  readonly sessionId: string | null
  /** Whether a request is in flight */
  readonly isLoading: boolean
  /** Last error (cleared on next successful send) */
  readonly error: string | null
}
