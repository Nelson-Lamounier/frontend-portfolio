/**
 * @format
 * Resume management server functions for the admin dashboard.
 *
 * Provides CRUD operations for resume templates stored in DynamoDB,
 * all protected by JWT authentication via `requireAuth()`.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  listResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  setActiveResume,
  getActiveResume,
} from '@/lib/resumes/dynamodb-resumes'
import type { ResumeData } from '@/lib/resumes/resume-data'
import { requireAuth } from './auth-guard'

// =============================================================================
// Input Schemas
// =============================================================================

const resumeIdSchema = z.string().min(1, 'Resume ID is required')

/**
 * ResumeData is a complex nested structure (personal info, experience, skills).
 * We validate the wrapper and pass the data payload as `unknown` → cast inside
 * the DynamoDB layer which owns the full type.
 */
const createResumeSchema = z.object({
  label: z.string().min(1, 'Resume label is required'),
  data: z.record(z.unknown()),
})

const updateResumeSchema = z.object({
  resumeId: z.string().min(1),
  label: z.string().min(1, 'Resume label is required'),
  data: z.record(z.unknown()),
})

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Lists all resume templates.
 *
 * @returns Array of resume summary records
 */
export const getResumesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    return await listResumes()
  },
)

/**
 * Retrieves a single resume by ID.
 *
 * @param data - The resume ID
 * @returns Full resume record
 */
export const getResumeFn = createServerFn({ method: 'GET' })
  .inputValidator(resumeIdSchema)
  .handler(async ({ data: resumeId }) => {
    await requireAuth()
    return await getResume(resumeId)
  })

/**
 * Creates a new resume template.
 *
 * @param data.label - Human-readable label for the resume
 * @param data.data - Full resume data structure
 * @returns Created resume record
 */
export const createResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(createResumeSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    return await createResume(data.label, data.data as unknown as ResumeData)
  })

/**
 * Updates an existing resume template.
 *
 * @param data.resumeId - The resume ID to update
 * @param data.label - Updated label
 * @param data.data - Updated resume data structure
 * @returns Updated resume record
 */
export const updateResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(updateResumeSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    return await updateResume(data.resumeId, data.label, data.data as unknown as ResumeData)
  })

/**
 * Permanently deletes a resume template.
 *
 * @param data - The resume ID
 * @returns Success indicator
 */
export const deleteResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(resumeIdSchema)
  .handler(async ({ data: resumeId }) => {
    await requireAuth()
    await deleteResume(resumeId)
    return { success: true }
  })

/**
 * Sets a resume as the active/default template.
 *
 * @param data - The resume ID to activate
 * @returns Success indicator
 */
export const setActiveResumeFn = createServerFn({ method: 'POST' })
  .inputValidator(resumeIdSchema)
  .handler(async ({ data: resumeId }) => {
    await requireAuth()
    return await setActiveResume(resumeId)
  })

/**
 * Retrieves the currently active resume template.
 *
 * @returns The active resume record or null
 */
export const getActiveResumeFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    return await getActiveResume()
  },
)
