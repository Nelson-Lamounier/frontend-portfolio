/**
 * useResumeVersions — TanStack Query Hook
 *
 * Fetches all resume versions from `GET /api/admin/resumes` for the
 * resume selector dropdown in the applications analysis form.
 *
 * @module
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchAdminResumes } from '@/lib/api/admin-api'
import type { AdminResume } from '@/lib/api/admin-api'

/** Resumes rarely change mid-session — cache aggressively */
const STALE_TIME = 60_000

/**
 * Fetches all resume versions for the dropdown selector.
 * Pre-sorts by date (newest first) with the active resume at the top.
 *
 * @returns TanStack Query result with AdminResume[]
 */
export function useResumeVersions() {
  return useQuery<AdminResume[]>({
    queryKey: adminKeys.resumes.list(),
    queryFn: fetchAdminResumes,
    staleTime: STALE_TIME,
  })
}
