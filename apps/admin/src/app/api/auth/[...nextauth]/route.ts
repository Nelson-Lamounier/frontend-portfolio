/**
 * NextAuth.js API Route Handler
 *
 * Exposes the NextAuth.js authentication endpoints:
 *   POST /api/auth/signin  — sign in
 *   POST /api/auth/signout — sign out
 *   GET  /api/auth/session — session check
 *   GET  /api/auth/csrf    — CSRF token
 *
 * @see https://authjs.dev/getting-started/installation#configure
 */

import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
