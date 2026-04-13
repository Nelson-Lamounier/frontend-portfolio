/** @format */

/**
 * POST /api/track-error
 *
 * Tracks client-side and server-side errors for observability.
 * Protected by in-memory rate limiting (10 requests per 60 seconds per IP)
 * and input validation to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server'
import { trackError } from '@/lib/observability/metrics'
import { createRateLimiter } from '@/lib/rate-limiter'

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum allowed length for stack trace strings */
const MAX_STACK_LENGTH = 2000

/** Maximum allowed length for error message strings */
const MAX_ERROR_LENGTH = 500

/** Maximum allowed length for context strings */
const MAX_CONTEXT_LENGTH = 200

// =============================================================================
// Rate Limiter (singleton — 10 requests per 60 seconds per IP)
// =============================================================================

const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
})

// =============================================================================
// Route Handler
// =============================================================================

/**
 * Tracks a client or server error — rate-limited and validated.
 *
 * @param request - JSON body with `error`, optional `stack`, `context`, `isClient`
 * @returns JSON `{ success: true }` on success, or error response
 */
export async function POST(request: NextRequest) {
  // ── Rate limiting ─────────────────────────────────────────────────────
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const limit = rateLimiter.check(clientIp)
  if (!limit.allowed) {
    const retryAfterSeconds = Math.ceil((limit.retryAfterMs ?? 60_000) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      },
    )
  }

  try {
    // ── Input validation ──────────────────────────────────────────────
    const body: unknown = await request.json()

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const { error, stack, context, isClient } = body as Record<string, unknown>

    // `error` is required and must be a string
    if (typeof error !== 'string' || error.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "error" field (must be a non-empty string)' },
        { status: 400 },
      )
    }

    // Sanitise and truncate inputs
    const sanitisedError = error.slice(0, MAX_ERROR_LENGTH)
    const sanitisedStack =
      typeof stack === 'string' ? stack.slice(0, MAX_STACK_LENGTH) : undefined
    const sanitisedContext =
      typeof context === 'string' ? context.slice(0, MAX_CONTEXT_LENGTH) : undefined
    const isClientFlag = typeof isClient === 'boolean' ? isClient : true

    // ── Extract error type ────────────────────────────────────────────
    const errorType = extractErrorType(sanitisedError, sanitisedStack)
    const location = sanitisedContext || extractLocation(sanitisedStack)

    // ── Track the error ───────────────────────────────────────────────
    trackError(errorType, location, isClientFlag)

    // Log to console for debugging (in production, send to logging service)
    if (process.env.NODE_ENV === 'production') {
      console.error('Error tracked:', {
        type: errorType,
        location,
        isClient: isClientFlag,
        error: sanitisedError,
        stack: sanitisedStack?.substring(0, 500),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to track error:', err)
    return NextResponse.json(
      { error: 'Failed to track error' },
      { status: 500 },
    )
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extracts the error type from the error message or stack trace.
 *
 * @param error - Error message
 * @param stack - Optional stack trace
 * @returns Detected error type
 */
function extractErrorType(error: string, stack?: string): string {
  if (stack) {
    const match = stack.match(/^(\w+Error):/)
    if (match) return match[1]
  }

  if (error.includes('fetch')) return 'FetchError'
  if (error.includes('network')) return 'NetworkError'
  if (error.includes('timeout')) return 'TimeoutError'
  if (error.includes('not found')) return 'NotFoundError'
  if (error.includes('permission')) return 'PermissionError'

  return 'UnknownError'
}

/**
 * Extracts the location (file/component) from a stack trace.
 *
 * @param stack - Stack trace string
 * @returns Location string or 'unknown'
 */
function extractLocation(stack?: string): string {
  if (!stack) return 'unknown'

  const lines = stack.split('\n')
  for (const line of lines) {
    const match = line.match(/at\s+(?:.*\s+)?\(?([^)]+)\)?/)
    if (match && match[1] && !match[1].includes('node_modules')) {
      return match[1].split(':')[0]
    }
  }

  return 'unknown'
}

// ── Route Segment Config ─────────────────────────────────────────────────────
// Explicitly pin to the Node.js runtime. prom-client (imported transitively
// via @/lib/observability/metrics) relies on Node-only APIs (process.hrtime,
// process.version, Buffer) which are not available in the Edge Runtime.
// Without this, Next.js emits build-time warnings on every affected import.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
