'use client'

/**
 * ResumeSection — public-facing resume preview and download.
 *
 * Rendered inside the Work card on the home page.
 * Provides two actions:
 *   - "Preview Resume" → full-screen modal showing the A4 ResumeDocument
 *   - "Download CV"    → generates a PDF via html2canvas + jsPDF and triggers
 *                        a browser download
 *
 * Data: fetches the active resume from /api/resume/active on mount.
 * Falls back to the ESC-tailored resume data if the API is unavailable.
 *
 * Read-only — no editing. Resume management lives in start-admin.
 * Isolated to apps/site — not shared with start-admin.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ResumeDocument } from './ResumeDocument'
import { resumeDataEsc as fallbackData } from '@/lib/resumes/resume-data-esc'
import { trackResumeDownload } from '@/lib/observability/analytics'
import type { ResumeData } from '@/lib/resumes/resume-data'

export function ResumeSection() {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [resumeData, setResumeData] = useState<ResumeData>(fallbackData)
  const fetchedRef = useRef(false)

  // Fetch the active resume from the site's own API proxy on mount.
  // Falls back to local ESC data silently if unavailable (204 or error).
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function loadActiveResume() {
      try {
        const res = await fetch('/api/resume/active')
        if (res.ok) {
          const body: unknown = await res.json()
          if (body && typeof body === 'object' && 'data' in body && body.data) {
            setResumeData(body.data as ResumeData)
          }
        }
        // 204 → no active resume set, keep fallback — no action needed
      } catch {
        // Network error → keep fallback data silently
      }
    }

    loadActiveResume()
  }, [])

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleDownload = useCallback(async () => {
    if (downloading) return
    setDownloading(true)

    let container: HTMLDivElement | null = null

    try {
      const [html2canvasModule, jspdfModule, domBuilderModule] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
        import('@/lib/resumes/resume-dom-builder'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule
      const { buildResumeDomForPdf, A4_WIDTH, A4_HEIGHT, PDF_BG } = domBuilderModule

      // Mount the resume DOM off-screen with inline styles so html2canvas
      // can capture it (Tailwind classes are not captured by html2canvas).
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

      // Overlay clickable PDF link annotations
      // html2canvas flattens everything to an image — pdf.link() adds
      // invisible clickable rectangles at the exact positions of [data-pdf-link] elements.
      const rootRect = resumeEl.getBoundingClientRect()
      const xScale = pdfWidth / A4_WIDTH   // mm per px (horizontal)
      const yScale = pdfHeight / A4_HEIGHT // mm per px (vertical)

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
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = 'Nelson_Lamounier_Resume.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      trackResumeDownload()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Resume PDF generation failed:', err)
    } finally {
      if (container?.parentNode) document.body.removeChild(container)
      setDownloading(false)
    }
  }, [downloading, resumeData])

  return (
    <>
      {/* Action buttons */}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white outline-offset-2 transition hover:bg-zinc-700 active:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:active:bg-zinc-100"
        >
          Preview Resume
          <ArrowRightIcon className="h-4 w-4 stroke-current" />
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-offset-2 transition hover:bg-zinc-100 active:bg-zinc-100 active:text-zinc-900/60 disabled:opacity-50 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:active:bg-zinc-800/50 dark:active:text-zinc-50/70"
        >
          {downloading ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin stroke-zinc-400" />
              Generating…
            </>
          ) : (
            <>
              Download CV
              <DownloadIcon className="h-4 w-4 stroke-zinc-400 transition group-active:stroke-zinc-600 dark:group-hover:stroke-zinc-50 dark:group-active:stroke-zinc-50" />
            </>
          )}
        </button>
      </div>

      {/* Preview modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="relative mx-4 my-8 flex flex-col items-center">
            {/* Floating action bar */}
            <div className="sticky top-0 z-10 mb-4 flex w-full max-w-[824px] items-center justify-between rounded-xl bg-white/90 px-5 py-3 shadow-lg backdrop-blur dark:bg-zinc-900/90">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Resume Preview
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {downloading ? (
                    <>
                      <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="h-3.5 w-3.5 stroke-current" />
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close preview"
                  className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <CloseIcon className="h-5 w-5 stroke-current" />
                </button>
              </div>
            </div>

            {/* A4 document — two pages with shadow */}
            <div className="flex flex-col gap-6 [&>div>div]:rounded-lg [&>div>div]:shadow-2xl [&>div>div]:ring-1 [&>div>div]:ring-black/5">
              <ResumeDocument data={resumeData} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Inline icon helpers ── */

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M5.75 12.25 10 8 5.75 3.75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M4.75 8.75 8 12.25m0 0 3.25-3.5M8 12.25v-8.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  )
}
