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
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getResumesFn,
  setActiveResumeFn,
  deleteResumeFn,
  getResumeFn,
} from '../../../server/resumes'
import type { ResumeSummary } from '@/lib/resumes/dynamodb-resumes'
import { useToastStore } from '@/lib/stores/toast-store'
import { buildResumeDomForPdf, A4_WIDTH, A4_HEIGHT, PDF_BG } from '@/lib/resumes/resume-dom-builder'

import { Link } from '@tanstack/react-router'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { Button } from '../../../components/ui/Button'
import { ResumePreviewDrawer } from './ResumePreviewDrawer'

export function ResumesPipeline() {
  const { addToast } = useToastStore()
  const queryClient = useQueryClient()

  // TanStack Query hooks — list
  const { data: resumes = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['admin-resumes'],
    queryFn: () => getResumesFn(),
  })

  // Preview state
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // TanStack Query hooks — detail
  const {
    data: previewResume,
    isLoading: isPreviewLoading,
  } = useQuery({
    queryKey: ['admin-resume-preview', previewId],
    queryFn: () => (getResumeFn as any)({ data: previewId || '' }),
    enabled: !!previewId,
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => (setActiveResumeFn as any)({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-resumes'] })
      addToast('success', 'Resume published successfully.')
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (deleteResumeFn as any)({ data: id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-resumes'] })
      addToast('success', 'Resume deleted successfully.')
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  const error = queryError?.message ?? null
  const activeResume = resumes.find((r: ResumeSummary) => r.isActive)
  const inactiveResumes = resumes.filter((r: ResumeSummary) => !r.isActive)

  function handlePreviewToggle(resumeId: string): void {
    setPreviewId((prev) => (prev === resumeId ? null : resumeId))
  }

  const handleDownloadPdf = useCallback(async () => {
    if (!previewResume || downloading) return
    setDownloading(true)

    let container: HTMLDivElement | null = null

    try {
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule

      // Mount the resume DOM off-screen so html2canvas can capture it
      container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDomForPdf(previewResume.data)
      container.appendChild(resumeEl)

      // Wait for browser to lay out the element before capturing
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

      // Overlay clickable link annotations (invisible rectangles over link text)
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
      downloadLink.download = 'Nelson_Lamounier_Resume.pdf'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      addToast('success', 'PDF downloaded successfully.')
    } catch (err) {
      console.error('Resume PDF generation failed:', err)
      addToast('error', `Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (container?.parentNode) document.body.removeChild(container)
      setDownloading(false)
    }
  }, [previewResume, downloading, addToast])

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
          className="inline-flex items-center justify-center gap-2 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-400/30 bg-blue-400/10 rounded hover:bg-blue-400/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50"
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
          className="mt-6 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-teal-500 text-teal-950 hover:bg-teal-600/90"
        >
          <Plus className="size-4 mr-2" />
          Create Resume
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-12">
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
      <ResumePreviewDrawer
        isOpen={!!previewId && !!previewResume}
        onClose={() => setPreviewId(null)}
        resume={previewResume}
        onDownload={handleDownloadPdf}
        isDownloading={downloading}
      />

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
    </div>
  )
}
