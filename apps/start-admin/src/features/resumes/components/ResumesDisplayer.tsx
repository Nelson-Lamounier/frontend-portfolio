import { useState, useCallback } from 'react'

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
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getResumesFn,
  setActiveResumeFn,
  deleteResumeFn,
  getResumeFn,
  createResumeFn,
} from '../../../server/resumes'
import { getTailoredResumesFn } from '../../../server/applications'
import type { TailoredResumeSummary } from '../../../server/applications'
import type { ResumeSummary } from '@/lib/resumes/dynamodb-resumes'
import type { ResumeData } from '@/lib/resumes/resume-data'
import { useToastStore } from '@/lib/stores/toast-store'
import { buildResumeDomForPdf, A4_WIDTH, A4_HEIGHT, PDF_BG } from '@/lib/resumes/resume-dom-builder'
import { adminKeys } from '@/lib/api/query-keys'

import { Link } from '@tanstack/react-router'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { Button } from '../../../components/ui/Button'
import { DashboardDrawer } from '../../../components/ui/DashboardDrawer'
import { ResumeDocument } from '../../../components/resume/ResumeDocument'

export function ResumesDisplayer() {
  const { addToast } = useToastStore()
  const queryClient = useQueryClient()

  // TanStack Query hooks — list
  const { data: resumes = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: adminKeys.resumes.list(),
    queryFn: () => getResumesFn(),
  })

  // TanStack Query — AI-generated tailored resumes from applications
  const { data: tailoredResumes = [] } = useQuery({
    queryKey: [...adminKeys.applications.all, 'tailored-resumes'],
    queryFn: () => getTailoredResumesFn(),
  })

  // Preview state — manually created resumes (fetched by ID)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Preview state — tailored resumes (data already in-memory from list)
  const [previewTailored, setPreviewTailored] = useState<TailoredResumeSummary | null>(null)

  // TanStack Query hooks — detail for manually created resumes
  const {
    data: previewResume,
    isLoading: isPreviewLoading,
  } = useQuery({
    queryKey: adminKeys.resumes.detail(previewId ?? ''),
    queryFn: () => getResumeFn({ data: previewId || '' }),
    enabled: !!previewId,
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => setActiveResumeFn({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resumes.all })
      addToast('success', 'Resume published successfully.')
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResumeFn({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resumes.all })
      addToast('success', 'Resume deleted successfully.')
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  // Promotes an AI-generated tailored resume to a standalone RESUME entity then activates it
  const publishTailoredMutation = useMutation({
    mutationFn: async (tr: TailoredResumeSummary) => {
      const created = await createResumeFn({
        data: {
          label: `${tr.targetCompany} — ${tr.targetRole}`,
          data: tr.data as unknown as Record<string, unknown>,
        },
      })
      await setActiveResumeFn({ data: created.resumeId })
      return created
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resumes.all })
      addToast('success', 'Resume published successfully.')
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  const error = queryError?.message ?? null
  const activeResume = resumes.find((r: ResumeSummary) => r.isActive)
  const inactiveResumes = resumes.filter((r: ResumeSummary) => !r.isActive)

  function handlePreviewToggle(resumeId: string): void {
    setPreviewId((prev) => (prev === resumeId ? null : resumeId))
  }

  const generatePdf = useCallback(async (resumeData: ResumeData, filename: string) => {
    if (downloading) return
    setDownloading(true)

    let container: HTMLDivElement | null = null

    try {
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule

      container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDomForPdf(resumeData)
      container.appendChild(resumeEl)

      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => setTimeout(r, 200))

      const actualHeight = resumeEl.scrollHeight

      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: PDF_BG,
        width: A4_WIDTH,
        height: actualHeight,
        // Strip all page stylesheets from the clone so Tailwind's oklch /
        // color-mix() values never reach html2canvas's CSS parser.
        // The resume uses inline styles only, so output is unaffected.
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove())
        },
      })

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
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
          ctx.drawImage(canvas, 0, srcY, A4_WIDTH * 2, srcH, 0, 0, A4_WIDTH * 2, srcH)
        }

        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      const rootRect = resumeEl.getBoundingClientRect()
      const xScale = pdfWidth / A4_WIDTH
      const yScale = pdfHeight / A4_HEIGHT

      resumeEl.querySelectorAll<HTMLElement>('[data-pdf-link]').forEach((el) => {
        const href = el.dataset.pdfLink
        if (!href) return
        const rect = el.getBoundingClientRect()
        const relX = rect.left - rootRect.left
        const relY = rect.top - rootRect.top
        const pageIndex = Math.floor(relY / A4_HEIGHT)
        const yOnPage = relY - pageIndex * A4_HEIGHT
        pdf.setPage(pageIndex + 1)
        pdf.link(relX * xScale, yOnPage * yScale, rect.width * xScale, rect.height * yScale, { url: href })
      })

      const blobUrl = URL.createObjectURL(pdf.output('blob'))
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = filename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      addToast('success', 'PDF downloaded successfully.')
    } catch (err) {
      addToast('error', `Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (container?.parentNode) document.body.removeChild(container)
      setDownloading(false)
    }
  }, [downloading, addToast])

  const handleDownloadPdf = useCallback(() => {
    if (!previewResume) return
    return generatePdf(previewResume.data as unknown as ResumeData, 'Nelson_Lamounier_Resume.pdf')
  }, [previewResume, generatePdf])

  const handleDownloadTailoredPdf = useCallback(() => {
    if (!previewTailored) return
    const filename = `Nelson_Lamounier_${previewTailored.targetCompany}_${previewTailored.targetRole}.pdf`
      .replace(/\s+/g, '_')
    return generatePdf(previewTailored.data, filename)
  }, [previewTailored, generatePdf])

  function handleActivate(resumeId: string): void {
    activateMutation.mutate(resumeId)
  }

  function handleDelete(resumeId: string, label: string): void {
    const confirmed = globalThis.window.confirm(
      `Are you sure you want to delete "${label}"?\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    if (previewId === resumeId) {
      setPreviewId(null)
    }

    deleteMutation.mutate(resumeId)
  }

  function renderActions(resume: ResumeSummary) {
    const isPreviewing = previewId === resume.resumeId

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isPreviewing ? 'primary' : 'ghost'}
          onClick={() => handlePreviewToggle(resume.resumeId)}
          disabled={isPreviewLoading && previewId === resume.resumeId}
        >
          {isPreviewing ? <EyeOff className="size-4 mr-2" /> : <Eye className="size-4 mr-2" />}
          {isPreviewing ? 'Hide' : 'Preview'}
        </Button>

        {!resume.isActive && (
          <Button
            variant="secondary"
            onClick={() => handleActivate(resume.resumeId)}
            disabled={activateMutation.isPending}
          >
            <ArrowUpCircle className="size-4 mr-2" />
            {activateMutation.isPending ? 'Publishing…' : 'Publish'}
          </Button>
        )}

        <Link
          to="/resumes/edit/$id"
          params={{ id: resume.resumeId }}
          className="inline-flex items-center justify-center gap-2 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-400/30 bg-blue-400/10 rounded hover:bg-blue-400/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
        >
          <Pencil className="size-3" />
          Edit
        </Link>

        {!resume.isActive && (
          <Button
            variant="danger"
            onClick={() => handleDelete(resume.resumeId, resume.label)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4 mr-2" />
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-zinc-400 py-10 text-center text-sm">Loading resumes...</div>
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-sm">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-800 p-12 text-center text-zinc-400">
        <FileText className="mx-auto size-12 opacity-50" />
        <h3 className="mt-4 text-sm font-semibold text-zinc-200">No resumes yet</h3>
        <p className="mt-2 text-xs">Create your first role-tailored resume to get started.</p>
        <Link
          to="/resumes/new"
          className="mt-6 inline-flex items-center justify-center gap-2 px-3 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500"
        >
          <Plus className="size-4" />
          Create Resume
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-12">
      {/* 0. Header actions */}
      <div className="flex justify-end">
        <Link
          to="/resumes/new"
          className="inline-flex items-center justify-center gap-2 px-3 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500"
        >
          <Plus className="size-4" />
          New Resume
        </Link>
      </div>

      {/* 1. Active Resume */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-teal-500">
          <CheckCircle className="size-4" />
          Currently Published
        </h2>
        {activeResume ? (
          <SectionHeader
            title={`${activeResume.label} (Active)`}
            description={`Last updated: ${new Date(activeResume.updatedAt).toLocaleDateString('en-GB')}`}
            action={renderActions(activeResume)}
          />
        ) : (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-500">
            <strong>No active resume.</strong> None of your resume versions are currently published.
          </div>
        )}
      </section>

      {/* 2. PDF Preview Drawer */}
      <DashboardDrawer
        isOpen={!!previewId && !!previewResume}
        onClose={() => setPreviewId(null)}
        title="PDF Preview"
        description={previewResume?.label ?? 'Resume'}
        unstyledContent
        actions={
          previewResume && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              <Download className="mr-2 size-4" />
              {downloading ? 'Generating…' : 'Download PDF'}
            </Button>
          )
        }
      >
        {previewResume ? (
          <div className="h-full overflow-y-auto no-scrollbar rounded-xl border border-white/10 bg-black/40 p-6 shadow-inner">
            <div
              className="mx-auto origin-top"
              style={{ width: '794px', transform: 'scale(0.95)', transformOrigin: 'top center' }}
            >
              <div className="flex flex-col gap-6 [&>div>div]:rounded-lg [&>div>div]:shadow-2xl [&>div>div]:ring-1 [&>div>div]:ring-white/10 relative z-10 bg-white">
                <ResumeDocument data={previewResume.data as unknown as ResumeData} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Loading preview...
          </div>
        )}
      </DashboardDrawer>

      {/* 3. Inactive Versions */}
      {inactiveResumes.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Other Versions ({inactiveResumes.length})
          </h2>
          <div className="space-y-4">
            {inactiveResumes.map((resume) => (
              <SectionHeader
                key={resume.resumeId}
                title={resume.label}
                description={`Updated: ${new Date(resume.updatedAt).toLocaleDateString('en-GB')}`}
                action={renderActions(resume)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. AI-Generated Tailored Resumes */}
      {tailoredResumes.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-indigo-400">
            AI-Generated Tailored Resumes ({tailoredResumes.length})
          </h2>
          <div className="space-y-4">
            {tailoredResumes.map((tr) => (
              <SectionHeader
                key={tr.slug}
                title={`${tr.targetCompany} — ${tr.targetRole}`}
                description={`Generated: ${new Date(tr.updatedAt).toLocaleDateString('en-GB')}`}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={previewTailored?.slug === tr.slug ? 'primary' : 'ghost'}
                      onClick={() => setPreviewTailored((prev) => prev?.slug === tr.slug ? null : tr)}
                    >
                      {previewTailored?.slug === tr.slug
                        ? <><EyeOff className="size-4 mr-2" />Hide</>
                        : <><Eye className="size-4 mr-2" />Preview</>
                      }
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => publishTailoredMutation.mutate(tr)}
                      disabled={publishTailoredMutation.isPending}
                    >
                      <ArrowUpCircle className="size-4 mr-2" />
                      {publishTailoredMutation.isPending ? 'Publishing…' : 'Publish'}
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Tailored Resume Preview Drawer */}
      <DashboardDrawer
        isOpen={!!previewTailored}
        onClose={() => setPreviewTailored(null)}
        title="AI Tailored Resume"
        description={previewTailored ? `${previewTailored.targetCompany} — ${previewTailored.targetRole}` : ''}
        unstyledContent
        actions={
          previewTailored && (
            <Button variant="primary" size="sm" onClick={handleDownloadTailoredPdf} disabled={downloading}>
              <Download className="mr-2 size-4" />
              {downloading ? 'Generating…' : 'Download PDF'}
            </Button>
          )
        }
      >
        {previewTailored ? (
          <div className="h-full overflow-y-auto no-scrollbar rounded-xl border border-white/10 bg-black/40 p-6 shadow-inner">
            <div
              className="mx-auto origin-top"
              style={{ width: '794px', transform: 'scale(0.95)', transformOrigin: 'top center' }}
            >
              <div className="flex flex-col gap-6 [&>div>div]:rounded-lg [&>div>div]:shadow-2xl [&>div>div]:ring-1 [&>div>div]:ring-white/10 relative z-10 bg-white">
                <ResumeDocument data={previewTailored.data} />
              </div>
            </div>
          </div>
        ) : null}
      </DashboardDrawer>
    </div>
  )
}
