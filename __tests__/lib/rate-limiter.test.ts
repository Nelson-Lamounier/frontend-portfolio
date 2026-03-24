/**
 * Unit tests for the in-memory sliding-window rate limiter.
 *
 * Tests cover:
 * - Allowing requests within the limit
 * - Blocking requests that exceed the limit
 * - Independent tracking per IP/key
 * - Remaining count accuracy
 * - retryAfterMs calculation
 */

import { createRateLimiter } from '@/lib/rate-limiter'

describe('createRateLimiter', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 })

    const r1 = limiter.check('192.168.1.1')
    const r2 = limiter.check('192.168.1.1')
    const r3 = limiter.check('192.168.1.1')

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)

    limiter.destroy()
  })

  it('blocks requests that exceed the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 })

    limiter.check('10.0.0.1')
    limiter.check('10.0.0.1')
    const blocked = limiter.check('10.0.0.1')

    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBeDefined()
    expect(blocked.retryAfterMs).toBeGreaterThan(0)

    limiter.destroy()
  })

  it('tracks IPs independently', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 })

    const ip1 = limiter.check('10.0.0.1')
    const ip2 = limiter.check('10.0.0.2')

    // Both should be allowed (first request each)
    expect(ip1.allowed).toBe(true)
    expect(ip2.allowed).toBe(true)

    // Second request for ip1 should be blocked
    const ip1Again = limiter.check('10.0.0.1')
    expect(ip1Again.allowed).toBe(false)

    // ip2 is still allowed for a second request (separate IP)
    // Actually ip2 already used its one request, so it should also be blocked
    const ip2Again = limiter.check('10.0.0.2')
    expect(ip2Again.allowed).toBe(false)

    limiter.destroy()
  })

  it('returns accurate remaining count', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })

    const r1 = limiter.check('10.0.0.1')
    expect(r1.remaining).toBe(4)

    const r2 = limiter.check('10.0.0.1')
    expect(r2.remaining).toBe(3)

    const r3 = limiter.check('10.0.0.1')
    expect(r3.remaining).toBe(2)

    limiter.destroy()
  })

  it('allows requests again after window expires', () => {
    jest.useFakeTimers()
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 })

    // Use the first request
    const r1 = limiter.check('10.0.0.1')
    expect(r1.allowed).toBe(true)

    // Should be blocked
    const r2 = limiter.check('10.0.0.1')
    expect(r2.allowed).toBe(false)

    // Advance past the window
    jest.advanceTimersByTime(1001)

    // Should be allowed again
    const r3 = limiter.check('10.0.0.1')
    expect(r3.allowed).toBe(true)

    limiter.destroy()
  })

  it('resets a specific key', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 })

    limiter.check('10.0.0.1')
    const blocked = limiter.check('10.0.0.1')
    expect(blocked.allowed).toBe(false)

    // Reset the key
    limiter.reset('10.0.0.1')

    const afterReset = limiter.check('10.0.0.1')
    expect(afterReset.allowed).toBe(true)

    limiter.destroy()
  })
})
