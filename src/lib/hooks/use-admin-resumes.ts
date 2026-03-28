/**
 * Admin Resumes Hooks
 *
 * TanStack Query hooks for resume listing, detail preview,
 * and management mutations. All mutations automatically
 * invalidate the resumes cache.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import {
  activateResume,
  deleteResume,
  fetchAdminResumes,
  fetchResumeById,
} from '@/lib/api/admin-api'
import type { AdminResume, AdminResumeWithData } from '@/lib/api/admin-api'
export type { AdminResume, AdminResumeWithData } from '@/lib/api/admin-api'

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Fetches all resume versions.
 *
 * @returns TanStack Query result with resume array
 */
export function useAdminResumes() {
  return useQuery<AdminResume[]>({
    queryKey: adminKeys.resumes.list(),
    queryFn: fetchAdminResumes,
  })
}

/**
 * Fetches a single resume with full data for PDF preview.
 * Disabled when `resumeId` is null (no preview requested).
 *
 * @param resumeId - UUID of the resume to preview, or null
 * @returns TanStack Query result with full resume data
 */
export function useResumePreview(resumeId: string | null) {
  return useQuery<AdminResumeWithData>({
    queryKey: adminKeys.resumes.detail(resumeId ?? ''),
    queryFn: () => fetchResumeById(resumeId!),
    enabled: !!resumeId,
  })
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Mutation hook for activating a resume version.
 * Invalidates the resumes cache on success.
 *
 * @returns TanStack Mutation with `mutate(id)`
 */
export function useActivateResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => activateResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resumes.all })
    },
  })
}

/**
 * Mutation hook for deleting a resume version.
 * Invalidates the resumes cache on success.
 *
 * @returns TanStack Mutation with `mutate(id)`
 */
export function useDeleteResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteResume(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resumes.all })
    },
  })
}
