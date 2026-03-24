/**
 * Admin Resumes Page
 *
 * Management dashboard for resume versions. Lists all resumes
 * with actions to create, edit, delete, and set the active version.
 *
 * Route: /admin/resumes
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ResumeSummary } from '@/lib/dynamodb-resumes'

// =============================================================================
// TYPES
// =============================================================================

type PageState = 'loading' | 'ready' | 'error'

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin page listing all resume versions with management actions.
 *
 * @returns Admin resumes page JSX
 */
export default function AdminResumesPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>('loading')
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Fetch resumes on mount
  useEffect(() => {
    fetchResumes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetches all resume versions from the admin API.
   */
  const fetchResumes = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const res = await fetch('/api/admin/resumes')

      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      const data = await res.json() as ResumeSummary[]
      setResumes(data)
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resumes')
      setState('error')
    }
  }, [router])

  /**
   * Sets a resume as the publicly displayed version.
   */
  const handleActivate = useCallback(async (resumeId: string) => {
    if (activating) return
    setActivating(resumeId)

    try {
      const res = await fetch(`/api/admin/resumes/${resumeId}/activate`, {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      await fetchResumes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate resume')
    } finally {
      setActivating(null)
    }
  }, [activating, fetchResumes])

  /**
   * Deletes a resume version after confirmation.
   */
  const handleDelete = useCallback(async (resumeId: string, label: string) => {
    if (deleting) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${label}"?\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    setDeleting(resumeId)

    try {
      const res = await fetch(`/api/admin/resumes/${resumeId}`, {
        method: 'DELETE',
      })

      if (res.status === 409) {
        setError('Cannot delete the active resume. Set another resume as active first.')
        return
      }

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      await fetchResumes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume')
    } finally {
      setDeleting(null)
    }
  }, [deleting, fetchResumes])

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Resume Versions
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your resume versions. The active resume is displayed on your public portfolio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/resumes/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Resume
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
        </div>
      )}

      {/* Empty State */}
      {state === 'ready' && resumes.length === 0 && (
        <div className="mt-12 rounded-xl border-2 border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No resumes yet
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Create your first resume version to get started.
          </p>
          <button
            type="button"
            onClick={() => router.push('/admin/resumes/new')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500"
          >
            Create Resume
          </button>
        </div>
      )}

      {/* Resume Cards */}
      {state === 'ready' && resumes.length > 0 && (
        <div className="mt-6 space-y-4">
          {resumes.map((resume) => (
            <div
              key={resume.resumeId}
              className={`rounded-xl border p-5 transition ${
                resume.isActive
                  ? 'border-teal-500 bg-teal-50/50 shadow-sm dark:border-teal-600 dark:bg-teal-950/20'
                  : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {resume.label}
                    </h3>
                    {resume.isActive && (
                      <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                        ✓ Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Created: {new Date(resume.createdAt).toLocaleDateString('en-GB')}</span>
                    <span>Updated: {new Date(resume.updatedAt).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!resume.isActive && (
                    <button
                      type="button"
                      onClick={() => handleActivate(resume.resumeId)}
                      disabled={!!activating}
                      className="rounded-lg border border-teal-300 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50 disabled:opacity-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/30"
                    >
                      {activating === resume.resumeId ? 'Activating…' : 'Set Active'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/resumes/edit/${resume.resumeId}`)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Edit
                  </button>
                  {!resume.isActive && (
                    <button
                      type="button"
                      onClick={() => handleDelete(resume.resumeId, resume.label)}
                      disabled={!!deleting}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      {deleting === resume.resumeId ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back to Admin */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => router.push('/admin/drafts')}
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Back to Articles
        </button>
      </div>
    </div>
  )
}
