/**
 * Admin API Fetchers
 *
 * Centralised, typed fetch functions for all admin API endpoints.
 * Each function is a plain `async` function (not a hook) usable as
 * a TanStack Query `queryFn` or called directly in mutations.
 *
 * All functions use the shared `adminFetch()` helper which handles:
 * - 401 → throws `UnauthorisedError` (redirects handled by the caller)
 * - Non-ok responses → throws `ApiError` with the server message
 * - JSON parsing with proper return typing
 */

import type { ArticleWithSlug } from '@/lib/types/article.types'
import type { ResumeData } from '@/lib/resumes/resume-data'

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Thrown when the API returns 401 (session expired) */
export class UnauthorisedError extends Error {
  constructor() {
    super('Session expired. Please sign in again.')
    this.name = 'UnauthorisedError'
  }
}

/** Thrown when the API returns an error response */
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// =============================================================================
// RESPONSE INTERFACES
// =============================================================================

/** Shape of the admin articles listing response */
export interface AdminArticlesResponse {
  readonly drafts: ArticleWithSlug[]
  readonly published: ArticleWithSlug[]
  readonly draftCount: number
  readonly publishedCount: number
}

/** Shape of a pending comment from the admin API */
export interface AdminComment {
  readonly commentId: string
  readonly articleSlug: string
  readonly name: string
  readonly email: string
  readonly body: string
  readonly status: string
  readonly createdAt: string
}

/** Shape of a resume summary from the admin API (list endpoint) */
export interface AdminResume {
  readonly resumeId: string
  readonly label: string
  readonly isActive: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

/** Shape of a full resume with data payload (detail endpoint) */
export interface AdminResumeWithData extends AdminResume {
  readonly data: ResumeData
}

/** Shape of the publish-draft API response (upload-only, non-blocking) */
export interface PublishDraftResponse {
  readonly success: boolean
  readonly slug: string
  readonly message: string
  readonly error?: string
}

/** Pipeline state enumeration — matches pipeline-status API route */
export type PipelineState =
  | 'pending'
  | 'processing'
  | 'review'
  | 'published'
  | 'rejected'
  | 'failed'

/** Shape of the pipeline-status API response */
export interface PipelineStatusResponse {
  readonly slug: string
  readonly pipelineState: PipelineState
  readonly s3ReviewExists: boolean
  readonly dynamoMetadata: boolean
  readonly title?: string
  readonly updatedAt?: string
  readonly statusRaw?: string
}

/** Shape of the pipeline-action API response */
export interface PipelineActionResponse {
  readonly success: boolean
  readonly slug: string
  readonly action?: 'approve' | 'reject'
  readonly message: string
  readonly error?: string
}

// =============================================================================
// SHARED FETCH HELPER
// =============================================================================

/**
 * Shared admin fetch wrapper with error handling.
 *
 * @param url - API endpoint URL (relative)
 * @param options - Standard RequestInit options
 * @returns Parsed JSON response
 * @throws UnauthorisedError if the server responds with 401
 * @throws ApiError for all other non-ok responses
 */
async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
  })

  if (response.status === 401) {
    throw new UnauthorisedError()
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' })) as {
      error?: string
    }
    throw new ApiError(body.error ?? `HTTP ${response.status}`, response.status)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// =============================================================================
// QUERY FETCHERS (used as queryFn)
// =============================================================================

/**
 * Fetches all admin articles (drafts + published).
 *
 * @returns Articles listing with counts
 */
export async function fetchAdminArticles(): Promise<AdminArticlesResponse> {
  return adminFetch<AdminArticlesResponse>('/admin/api/articles?status=all')
}

/**
 * Fetches pending comments awaiting moderation.
 *
 * @returns Array of pending comments
 */
export async function fetchAdminComments(): Promise<AdminComment[]> {
  return adminFetch<AdminComment[]>('/admin/api/comments')
}

/**
 * Fetches all resume versions.
 *
 * @returns Array of resume entries
 */
export async function fetchAdminResumes(): Promise<AdminResume[]> {
  return adminFetch<AdminResume[]>('/admin/api/resumes')
}

/**
 * Fetches a single resume with full data payload for PDF preview.
 *
 * @param resumeId - UUID of the resume to fetch
 * @returns Full resume including ResumeData
 */
export async function fetchResumeById(resumeId: string): Promise<AdminResumeWithData> {
  return adminFetch<AdminResumeWithData>(
    `/admin/api/resumes/${encodeURIComponent(resumeId)}`,
  )
}

/**
 * Shape of the GET /admin/api/articles/content response.
 */
export interface ArticleContentResponse {
  readonly slug: string
  readonly contentRef: string
  readonly content: string
  readonly title: string
  readonly description: string
  readonly status: string
}

/**
 * Fetches article content (MDX) and metadata for the editor.
 *
 * @param slug - Article slug to fetch content for
 * @returns Full content response with title, description, status
 */
export async function fetchArticleContent(
  slug: string,
): Promise<ArticleContentResponse> {
  return adminFetch<ArticleContentResponse>(
    `/admin/api/articles/content?slug=${encodeURIComponent(slug)}`,
  )
}

// =============================================================================
// MUTATION FETCHERS (used in useMutation)
// =============================================================================

/**
 * Publishes a draft article (moves to published).
 *
 * @param slug - Article slug to publish
 */
export async function publishArticle(slug: string): Promise<void> {
  await adminFetch('/admin/api/articles/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })
}

/**
 * Unpublishes an article (moves back to draft).
 *
 * @param slug - Article slug to unpublish
 */
export async function unpublishArticle(slug: string): Promise<void> {
  await adminFetch('/admin/api/articles/unpublish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })
}

/**
 * Deletes an article from DynamoDB.
 *
 * @param slug - Article slug to delete
 */
export async function deleteArticle(slug: string): Promise<void> {
  await adminFetch('/admin/api/articles/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })
}

/**
 * Updates article metadata (e.g., githubUrl).
 *
 * @param slug - Article slug
 * @param updates - Partial metadata fields to update
 */
export async function updateArticleMetadata(
  slug: string,
  updates: Record<string, unknown>,
): Promise<void> {
  await adminFetch('/admin/api/articles/metadata', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, updates }),
  })
}

/**
 * Saves article content in the editor.
 *
 * @param slug - Article slug
 * @param content - Raw MDX content string
 */
export async function saveArticleContent(
  slug: string,
  content: string,
): Promise<void> {
  await adminFetch('/admin/api/articles/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, content }),
  })
}

/**
 * Publishes a draft file via the AI Agent / Publish page.
 *
 * @param fileName - Draft file name
 * @param content - File content
 * @returns Publish response with S3 key
 */
export async function publishDraft(
  fileName: string,
  content: string,
): Promise<PublishDraftResponse> {
  return adminFetch<PublishDraftResponse>('/admin/api/publish-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  })
}

// =============================================================================
// PIPELINE FETCHERS
// =============================================================================

/**
 * Polls the Bedrock pipeline status for a given article slug.
 *
 * @param slug - Article slug to check pipeline status for
 * @returns Pipeline status response with current state
 */
export async function fetchPipelineStatus(
  slug: string,
): Promise<PipelineStatusResponse> {
  return adminFetch<PipelineStatusResponse>(
    `/admin/api/pipeline-status?slug=${encodeURIComponent(slug)}`,
  )
}

/**
 * Submits an approve or reject action to the Publish Lambda.
 *
 * @param slug - Article slug to act on
 * @param action - Editorial action: 'approve' or 'reject'
 * @returns Action response with success/failure
 */
export async function submitPipelineAction(
  slug: string,
  action: 'approve' | 'reject',
): Promise<PipelineActionResponse> {
  return adminFetch<PipelineActionResponse>('/admin/api/pipeline-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, action }),
  })
}

/**
 * Moderates a comment (approve or reject).
 *
 * @param compositeId - Composite comment ID (slug__COMMENT#timestamp#uuid)
 * @param action - Moderation action
 */
export async function moderateComment(
  compositeId: string,
  action: 'approve' | 'reject',
): Promise<void> {
  await adminFetch(`/admin/api/comments/${encodeURIComponent(compositeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

/**
 * Permanently deletes a comment.
 *
 * @param compositeId - Composite comment ID
 */
export async function deleteComment(compositeId: string): Promise<void> {
  await adminFetch(`/admin/api/comments/${encodeURIComponent(compositeId)}`, {
    method: 'DELETE',
  })
}

/**
 * Activates a resume version (makes it the live CV).
 *
 * @param id - Resume ID to activate
 */
export async function activateResume(id: string): Promise<void> {
  await adminFetch(`/admin/api/resumes/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
  })
}

/**
 * Deletes a resume version.
 *
 * @param id - Resume ID to delete
 */
export async function deleteResume(id: string): Promise<void> {
  await adminFetch(`/admin/api/resumes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// =============================================================================
// STRATEGIST FETCHERS
// =============================================================================

/** Shape of a applications application summary for the list endpoint */
export type { ApplicationSummary } from '@/lib/types/applications.types'

/** Shape of a full applications application detail */
export type { ApplicationDetail } from '@/lib/types/applications.types'

/** Trigger response from the applications pipeline */
export type { TriggerResponse as ApplicationsTriggerResponse } from '@/lib/types/applications.types'

/** Status update response */
export type { StatusUpdateResponse as ApplicationsStatusResponse } from '@/lib/types/applications.types'

/**
 * Fetches applications applications, optionally filtered by status.
 *
 * @param status - Status filter (default: 'all')
 * @returns Array of application summaries
 */
export async function fetchApplicationsApplications(
  status = 'all',
): Promise<import('@/lib/types/applications.types').ApplicationSummary[]> {
  return adminFetch(
    `/admin/api/strategist/applications?status=${encodeURIComponent(status)}`,
  )
}

/**
 * Fetches full detail for a single applications application.
 *
 * @param slug - Application slug
 * @returns Full ApplicationDetail
 */
export async function fetchApplicationsApplication(
  slug: string,
): Promise<import('@/lib/types/applications.types').ApplicationDetail> {
  return adminFetch(
    `/admin/api/strategist/applications/${encodeURIComponent(slug)}`,
  )
}

/**
 * Triggers a new applications analysis pipeline (Research → Applications).
 *
 * @param body - Analysis trigger body (JD, company, role, optional resumeId)
 * @returns Trigger response with pipelineId and slug
 */
export async function triggerApplicationsAnalysis(
  body: import('@/lib/types/applications.types').AnalyseTriggerBody,
): Promise<import('@/lib/types/applications.types').TriggerResponse> {
  return adminFetch('/admin/api/strategist/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Triggers the Coach pipeline for a specific interview stage.
 *
 * @param body - Coach trigger body (applicationSlug, interviewStage)
 * @returns Trigger response with pipelineId and slug
 */
export async function triggerApplicationsCoach(
  body: import('@/lib/types/applications.types').CoachTriggerBody,
): Promise<import('@/lib/types/applications.types').TriggerResponse> {
  return adminFetch('/admin/api/strategist/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Updates the lifecycle status of a applications application.
 *
 * @param slug - Application slug
 * @param status - New status
 * @param interviewStage - Optional new interview stage
 * @returns Status update response
 */
export async function updateApplicationsStatus(
  slug: string,
  status: import('@/lib/types/applications.types').ApplicationStatus,
  interviewStage?: import('@/lib/types/applications.types').InterviewStage,
): Promise<import('@/lib/types/applications.types').StatusUpdateResponse> {
  return adminFetch(
    `/admin/api/strategist/applications/${encodeURIComponent(slug)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, interviewStage }),
    },
  )
}


/**
 * Deletes a applications application and all its related records.
 */
export async function deleteApplicationsApplication(slug: string): Promise<void> {
  await adminFetch(`/admin/api/strategist/applications/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })
}
