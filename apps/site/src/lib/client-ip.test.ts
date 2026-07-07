/** @format */

/**
 * Tests for getClientIp — trusted-proxy client IP resolution.
 *
 * Security property: a caller can never influence the resolved IP by
 * pre-seeding X-Forwarded-For, because only the rightmost (ALB-appended) entry
 * is trusted.
 */

import { getClientIp } from './client-ip'

/** Build a Headers object from a plain map. */
function headers(map: Record<string, string>): Headers {
  return new Headers(map)
}

describe('getClientIp', () => {
  it('returns the sole XFF entry when there is one trusted hop', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('returns the rightmost (ALB-appended) entry, ignoring a spoofed leftmost', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('ignores a long spoofed chain and trusts only the last hop', () => {
    expect(
      getClientIp(headers({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 203.0.113.9' })),
    ).toBe('203.0.113.9')
  })

  it('never trusts a client-supplied X-Real-IP', () => {
    expect(getClientIp(headers({ 'x-real-ip': '1.2.3.4' }))).toBe('unknown')
  })

  it('tolerates whitespace and trailing commas', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '1.2.3.4 , 203.0.113.9 ,' }))).toBe(
      '203.0.113.9',
    )
  })

  it('returns "unknown" when no forwarded header is present', () => {
    expect(getClientIp(headers({}))).toBe('unknown')
  })
})
