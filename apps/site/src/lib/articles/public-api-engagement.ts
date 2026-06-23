/**
 * Public-API Engagement Data Layer (Server-Side Only)
 *
 * RDS-backed article likes + comments, read/written through the in-cluster
 * `public-api` BFF over Kubernetes service DNS. Replaces the legacy
 * direct-DynamoDB engagement layer so the portfolio holds no AWS data
 * credentials and makes no direct DynamoDB calls.
 *
 * Upstream contract (public-api):
 *   GET  /api/articles/:slug/like?sessionId= → { liked, likeCount }
 *   POST /api/articles/:slug/like { sessionId } → { liked, likeCount }
 *   GET  /api/articles/:slug/comments          → PublicComment[]
 *   POST /api/articles/:slug/comments { name, email, body } → 201 PublicComment
 *
 * This module should NEVER be imported from client components.
 *
 * Environment Variables:
 *   PUBLIC_API_URL — in-cluster BFF base URL (default: http://public-api.public-api:3001)
 */

/** In-cluster public-api BFF base URL (Kubernetes service DNS). */
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://public-api.public-api:3001'

// ========================================
// Types
// ========================================

/** Public-safe comment (no email/IP). */
export interface PublicComment {
  commentId: string
  name: string
  body: string
  createdAt: string
}

/** Like status for a session. */
export interface LikeStatus {
  liked: boolean
  likeCount: number
}

/**
 * Always "configured" — the in-cluster default URL is always present.
 * Kept for parity with the route guards; transient failures degrade
 * gracefully in the callers.
 */
export function isEngagementApiConfigured(): boolean {
  return true
}

// ========================================
// Likes
// ========================================

/** Check whether a session liked an article, plus the total count. */
export async function getLikeStatus(slug: string, sessionId: string): Promise<LikeStatus> {
  const url = `${PUBLIC_API_URL}/api/articles/${encodeURIComponent(slug)}/like?sessionId=${encodeURIComponent(sessionId)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`public-api like status ${res.status}`)
  return (await res.json()) as LikeStatus
}

/** Toggle a like for an article from a browser session. */
export async function toggleLike(slug: string, sessionId: string): Promise<LikeStatus> {
  const res = await fetch(`${PUBLIC_API_URL}/api/articles/${encodeURIComponent(slug)}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`public-api toggle like ${res.status}`)
  return (await res.json()) as LikeStatus
}

// ========================================
// Comments
// ========================================

/** Fetch approved comments for an article (public-safe). */
export async function getApprovedComments(slug: string): Promise<PublicComment[]> {
  const res = await fetch(`${PUBLIC_API_URL}/api/articles/${encodeURIComponent(slug)}/comments`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`public-api comments ${res.status}`)
  return (await res.json()) as PublicComment[]
}

/**
 * Submit a new comment (created server-side as 'pending').
 *
 * Validation and per-IP rate limiting live in public-api. The original
 * client IP is forwarded so the rate limit applies to the visitor, not the
 * portfolio pod. On a non-2xx upstream the upstream message is thrown so the
 * route can map rate-limit / validation errors to the right status.
 */
export async function createComment(
  slug: string,
  name: string,
  email: string,
  body: string,
  ipAddress: string,
): Promise<PublicComment> {
  const res = await fetch(`${PUBLIC_API_URL}/api/articles/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ipAddress,
    },
    body: JSON.stringify({ name, email, body }),
    cache: 'no-store',
  })

  if (!res.ok) {
    let message = 'Failed to submit comment'
    try {
      const err = (await res.json()) as { message?: string }
      if (typeof err.message === 'string') message = err.message
    } catch {
      // keep default
    }
    throw new Error(message)
  }

  return (await res.json()) as PublicComment
}
