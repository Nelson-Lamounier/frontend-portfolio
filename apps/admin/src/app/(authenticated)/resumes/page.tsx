/**
 * Admin Resumes Page
 *
 * Management dashboard for resume versions (PDF-oriented).
 * Prominently displays the currently active (published) resume
 * with an inline A4 PDF preview. Supports preview, edit, PDF download,
 * activate (publish), and delete actions for all versions.
 *
 * Uses TanStack Query for data fetching and mutations, and the
 * global toast store for user feedback notifications.
 *
 * Route: /admin/resumes
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  CheckCircle,
  Plus,
  FileText,
  ArrowUpCircle,
  Download,
  X,
} from 'lucide-react'
import { ResumeDocument } from '@/components/resume/ResumeDocument'
import {
  useAdminResumes,
  useResumePreview,
  useActivateResume,
  useDeleteResume,
} from '@/lib/hooks/use-admin-resumes'
import type { AdminResume } from '@/lib/hooks/use-admin-resumes'
import { useToastStore } from '@/lib/stores/toast-store'

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin page listing all resume versions with PDF preview,
 * edit, publish, download, and delete actions.
 * Data is fetched via TanStack Query — mutations automatically
 * invalidate the cache and update badge counts.
 *
 * @returns Admin resumes page JSX
 */
export default function AdminResumesPage() {
  const router = useRouter()
  const { addToast } = useToastStore()

  // TanStack Query hooks — list
  const { data: resumes = [], isLoading, error: queryError, refetch } = useAdminResumes()

  // Preview state — the ID of the resume currently being previewed
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // TanStack Query hooks — detail (PDF preview)
  const {
    data: previewResume,
    isLoading: isPreviewLoading,
  } = useResumePreview(previewId)

  // Mutation hooks
  const activateMutation = useActivateResume()
  const deleteMutation = useDeleteResume()

  // Derived state
  const error = queryError?.message ?? null
  const activeResume = resumes.find((r) => r.isActive)
  const inactiveResumes = resumes.filter((r) => !r.isActive)

  /**
   * Toggles the PDF preview panel for a given resume.
   *
   * @param resumeId - UUID of the resume to preview/hide
   */
  function handlePreviewToggle(resumeId: string): void {
    setPreviewId((prev) => (prev === resumeId ? null : resumeId))
  }

  /**
   * Sets a resume as the publicly displayed (active) version.
   *
   * @param resumeId - UUID of the resume to activate
   */
  function handleActivate(resumeId: string): void {
    activateMutation.mutate(resumeId, {
      onSuccess: () => addToast('success', 'Resume published successfully.'),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Deletes a resume version after confirmation.
   *
   * @param resumeId - UUID of the resume to delete
   * @param label - Human-friendly label for confirmation dialog
   */
  function handleDelete(resumeId: string, label: string): void {
    const confirmed = globalThis.window.confirm(
      `Are you sure you want to delete "${label}"?\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    // If we were previewing this resume, close the preview
    if (previewId === resumeId) {
      setPreviewId(null)
    }

    deleteMutation.mutate(resumeId, {
      onSuccess: () => addToast('success', `"${label}" deleted successfully.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Downloads the previewed resume as a PDF using html2canvas + jsPDF.
   */
  const handleDownloadPdf = useCallback(async () => {
    if (!previewResume || downloading) return
    setDownloading(true)

    try {
      const [html2canvasModule, jspdfModule, domBuilderModule] =
        await Promise.all([
          import('html2canvas'),
          import('jspdf'),
          import('@/lib/resumes/resume-dom-builder'),
        ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule
      const { buildResumeDomForPdf, A4_WIDTH, A4_HEIGHT, PDF_BG } =
        domBuilderModule

      // Build off-screen DOM
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.zIndex = '-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDomForPdf(previewResume.data)
      container.appendChild(resumeEl)

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      const actualHeight = resumeEl.scrollHeight
      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: PDF_BG,
        width: A4_WIDTH,
        height: actualHeight,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const pageCount = Math.round(actualHeight / A4_HEIGHT)

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage()

        const srcY = page * (A4_HEIGHT * 2)
        const srcH = Math.min(A4_HEIGHT * 2, canvas.height - srcY)

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = A4_WIDTH * 2
        pageCanvas.height = A4_HEIGHT * 2

        const ctx = pageCanvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = PDF_BG
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          ctx.drawImage(
            canvas,
            0, srcY, A4_WIDTH * 2, srcH,
            0, 0, A4_WIDTH * 2, srcH,
          )
        }

        const pageImgData = pageCanvas.toDataURL('image/png')
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      // Download
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = 'nelson_lamounier_resume.pdf'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      document.body.removeChild(container)
      addToast('success', 'PDF downloaded successfully.')
    } catch (err) {
      // eslint-disable-next-line no-console -- Intentional error log for PDF generation debugging
      console.error('Resume PDF generation failed:', err)
      addToast('error', 'Failed to generate PDF.')
    } finally {
      setDownloading(false)
    }
  }, [previewResume, downloading, addToast])

  // =========================================================================
  // Render helpers
  // =========================================================================

  /**
   * Renders the action buttons for a resume card.
   *
   * @param resume - Resume summary to render actions for
   * @returns Action buttons JSX
   */
  function renderActions(resume: AdminResume) {
    const isPreviewing = previewId === resume.resumeId

    return (
      <div className="flex shrink-0 items-center gap-2">
        {/* Preview PDF */}
        <button
          type="button"
          onClick={() => handlePreviewToggle(resume.resumeId)}
          disabled={isPreviewLoading && previewId === resume.resumeId}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            isPreviewing
              ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-950/30 dark:text-teal-400'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700'
          }`}
        >
          {isPreviewing ? (
            <><EyeOff className="h-3.5 w-3.5" />Hide</>
          ) : isPreviewLoading && previewId === resume.resumeId ? (
            <>Loading…</>
          ) : (
            <><Eye className="h-3.5 w-3.5" />Preview PDF</>
          )}
        </button>

        {/* Publish (only for inactive) */}
        {!resume.isActive && (
          <button
            type="button"
            onClick={() => handleActivate(resume.resumeId)}
            disabled={activateMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50 disabled:opacity-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/30"
          >
            <ArrowUpCircle className="h-3.5 w-3.5" />
            {activateMutation.isPending ? 'Publishing…' : 'Publish'}
          </button>
        )}

        {/* Edit */}
        <button
          type="button"
          onClick={() =>
            router.push(`/admin/resumes/edit/${resume.resumeId}`)
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>

        {/* Delete (only for inactive) */}
        {!resume.isActive && (
          <button
            type="button"
            onClick={() => handleDelete(resume.resumeId, resume.label)}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    )
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Resume Versions
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your role-tailored resume PDFs. The active version is served on the public site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/resumes/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          <Plus className="h-4 w-4" />
          New Resume
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && resumes.length === 0 && (
        <div className="mt-12 rounded-xl border-2 border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <FileText className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No resumes yet
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Create your first role-tailored resume to get started.
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

      {/* Ready State with resumes */}
      {!isLoading && !error && resumes.length > 0 && (
        <div className="mt-8 space-y-8">
          {/* ── Active Resume (Hero Card) ────────────────────────────── */}
          {activeResume && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <CheckCircle className="h-3.5 w-3.5 text-teal-500" />
                Currently Published
              </h2>
              <div className="rounded-xl border-2 border-teal-500/50 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 shadow-sm dark:border-teal-600/40 dark:from-teal-950/30 dark:to-emerald-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {activeResume.label}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        Created:{' '}
                        {new Date(activeResume.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>
                        Last updated:{' '}
                        {new Date(activeResume.updatedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      This version is served as the downloadable PDF on your public site.
                    </p>
                  </div>

                  {/* Active resume actions */}
                  {renderActions(activeResume)}
                </div>
              </div>
            </section>
          )}

          {/* ── PDF Preview Panel ────────────────────────────────────── */}
          {previewResume && previewId && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <Eye className="h-3.5 w-3.5" />
                  PDF Preview — {previewResume.label}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-500 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloading ? 'Generating…' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewId(null)}
                    className="rounded-lg border border-zinc-300 p-1.5 text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
                {/* A4 Paper Preview — scaled to fit */}
                <div className="mx-auto origin-top" style={{ width: '794px', transform: 'scale(0.75)', transformOrigin: 'top center' }}>
                  <div className="flex flex-col gap-6 [&>div>div]:rounded-lg [&>div>div]:shadow-2xl [&>div>div]:ring-1 [&>div>div]:ring-black/5">
                    <ResumeDocument data={previewResume.data} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Other Versions ───────────────────────────────────────── */}
          {inactiveResumes.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Other Versions ({inactiveResumes.length})
              </h2>
              <div className="space-y-3">
                {inactiveResumes.map((resume) => (
                  <div
                    key={resume.resumeId}
                    className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {resume.label}
                        </h3>
                        <div className="mt-1 flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>
                            Created:{' '}
                            {new Date(resume.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span>
                            Updated:{' '}
                            {new Date(resume.updatedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {renderActions(resume)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No active resume warning */}
          {!activeResume && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <strong>No active resume.</strong> None of your resume versions are currently
              published. Click &quot;Publish&quot; on a version to make it the public download.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
