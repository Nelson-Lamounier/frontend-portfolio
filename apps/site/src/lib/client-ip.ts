/**
 * client-ip.ts — resolve the real client IP from request headers in a way that
 * a caller cannot spoof.
 *
 * Why: these route handlers run in the `nextjs` pod, which sits directly behind
 * the shared `public` ALB. That ALB runs in `X-Forwarded-For` *append* mode, so
 * it appends the TCP peer's address as the RIGHTMOST entry and leaves any
 * caller-supplied entries to its left intact. The only trustworthy value is
 * therefore the last entry; the leftmost is fully attacker-controlled. Reading
 * the leftmost value (the previous behaviour) let anyone rotate a fake IP per
 * request to defeat per-IP rate limiting — both the local limiter here and the
 * downstream public-api comment limiter this IP is forwarded to.
 *
 * Gotcha: correct only while exactly one trusted proxy (the ALB) appends to XFF.
 * If another appending proxy is inserted in front of this pod, revisit the
 * trusted-hop count. The BFF mirrors this logic in
 * `api/public-api/src/lib/client-ip.ts` (ai-applications).
 */

/**
 * Resolve the client IP, trusting only the value appended by the immediate
 * upstream proxy (the rightmost `X-Forwarded-For` entry).
 *
 * Caller-supplied `X-Forwarded-For` and `X-Real-IP` values are ignored — they
 * are trivially spoofable and must never key a rate limit.
 *
 * @param headers - The incoming request headers.
 * @returns The trusted client IP, or `'unknown'` when no forwarded header is set.
 * @example
 *   // XFF: "1.2.3.4, 203.0.113.9" (1.2.3.4 spoofed by the client)
 *   getClientIp(request.headers) // => "203.0.113.9" (ALB-appended, trusted)
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    // Rightmost non-empty entry = address written by the trusted proxy (ALB).
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const trusted = parts[parts.length - 1]
    if (trusted) return trusted
  }
  return 'unknown'
}
