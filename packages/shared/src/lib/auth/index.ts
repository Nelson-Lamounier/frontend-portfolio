/**
 * Auth domain barrel — re-exports authentication configuration.
 *
 * Consumers should import from '@/lib/auth' which resolves to this
 * barrel file, preserving backward compatibility with the original
 * `@/lib/auth` import path.
 */

export { auth, handlers, signIn, signOut } from './auth'
