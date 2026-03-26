/**
 * Admin Login Server Action
 *
 * Uses the server-side `signIn` from Auth.js to authenticate directly,
 * bypassing the client-side CSRF token flow that fails behind the
 * CloudFront → Traefik HTTP proxy chain.
 *
 * Server Actions call the `authorize` function directly — no HTTP
 * roundtrip to `/api/auth/callback/credentials` is needed, so CSRF
 * token validation is not triggered.
 *
 * @module admin/login/actions
 */

'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

/**
 * Result returned from the authenticate action.
 */
export interface AuthResult {
  /** Whether the authentication was successful */
  success: boolean
  /** Error message if authentication failed */
  error?: string
}

/**
 * Authenticates admin credentials via the server-side Auth.js `signIn`.
 *
 * @param _prevState - Previous action state (required by useActionState)
 * @param formData - Form data containing username and password fields
 * @returns Authentication result with success/error status
 */
export async function authenticate(
  _prevState: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  try {
    await signIn('credentials', {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    // Auth.js throws a NEXT_REDIRECT for successful sign-in when
    // redirect is handled internally. Re-throw so Next.js handles it.
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof (error as Record<string, unknown>).digest === 'string' &&
      ((error as Record<string, unknown>).digest as string).startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Invalid username or password.' }
        default:
          return {
            success: false,
            error: 'Authentication failed. Please try again.',
          }
      }
    }

    // Unknown errors — log and return generic message
    console.error('[admin/login] Unexpected authentication error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
