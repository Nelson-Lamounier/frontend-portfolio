/**
 * In-Memory Sliding Window Rate Limiter
 *
 * Tracks requests per IP address using a sliding window approach.
 * Designed for Next.js API routes running on a single Node.js process.
 *
 * Features:
 * - Configurable per-IP window size and max requests
 * - Automatic cleanup of expired entries (every 60 seconds)
 * - Zero external dependencies
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
 * const result = limiter.check('192.168.1.1')
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', { status: 429 })
 * }
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration options for the rate limiter.
 */
export interface RateLimiterConfig {
  /** Time window in milliseconds (e.g., 60_000 for 1 minute) */
  readonly windowMs: number
  /** Maximum number of requests allowed within the window */
  readonly maxRequests: number
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  readonly allowed: boolean
  /** Remaining requests in the current window */
  readonly remaining: number
  /** Milliseconds until the rate limit resets (only set when blocked) */
  readonly retryAfterMs?: number
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

interface RequestEntry {
  timestamps: number[]
}

/**
 * Creates a new in-memory rate limiter instance.
 *
 * @param config - Rate limiter configuration
 * @returns Object with `check()` and `reset()` methods
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const { windowMs, maxRequests } = config
  const store = new Map<string, RequestEntry>()

  // Periodic cleanup of expired entries (every 60 seconds)
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
      // Remove empty entries
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, 60_000)

  // Ensure the interval doesn't prevent Node.js from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return {
    /**
     * Checks whether a request from the given key (typically an IP) is allowed.
     *
     * @param key - Identifier for the requester (e.g., IP address)
     * @returns Rate limit check result
     */
    check(key: string): RateLimitResult {
      const now = Date.now()
      let entry = store.get(key)

      if (!entry) {
        entry = { timestamps: [] }
        store.set(key, entry)
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

      if (entry.timestamps.length >= maxRequests) {
        // Find when the oldest request in the window will expire
        const oldestInWindow = entry.timestamps[0]
        const retryAfterMs = windowMs - (now - oldestInWindow)

        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(retryAfterMs, 0),
        }
      }

      // Allow the request
      entry.timestamps.push(now)

      return {
        allowed: true,
        remaining: maxRequests - entry.timestamps.length,
      }
    },

    /**
     * Resets the rate limit for a specific key. Useful for testing.
     *
     * @param key - Identifier to reset
     */
    reset(key: string): void {
      store.delete(key)
    },

    /**
     * Clears all rate limit data and stops the cleanup interval.
     */
    destroy(): void {
      store.clear()
      clearInterval(cleanupInterval)
    },
  }
}
