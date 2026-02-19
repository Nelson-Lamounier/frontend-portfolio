'use client'

/**
 * ResumePreview
 *
 * Full-screen modal overlay that renders the ResumeDocument at A4 scale
 * so the user can preview the resume before downloading.
 * Includes a "Download PDF" CTA that triggers the download.
 */

import { useState, useCallback, useEffect } from 'react'
import { ResumeDocument } from '@/components/ResumeDocument'
import { resumeDataEsc as resumeData } from '@/lib/resume-data-esc'
import { trackResumeDownload } from '@/lib/analytics'

export function ResumePreview() {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleDownload = useCallback(async () => {
    if (downloading) return
    setDownloading(true)

    try {
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule

      const A4_WIDTH = 794
      const A4_HEIGHT = 1123
      const BG = '#ffffff'

      // Build resume DOM off-screen with inline styles (same as ResumeDownloadButton)
      const { buildResumeDomForPdf } = await import(
        '@/lib/resume-dom-builder'
      )
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.zIndex = '-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDomForPdf(resumeData)
      container.appendChild(resumeEl)

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      const actualHeight = resumeEl.scrollHeight
      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: BG,
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
      const scaleFactor = pdfWidth / A4_WIDTH
      const totalPdfContentHeight = actualHeight * scaleFactor
      const pageCount = Math.ceil(totalPdfContentHeight / pdfHeight)

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage()

        const srcY = page * (A4_HEIGHT * 2)
        const srcH = Math.min(A4_HEIGHT * 2, canvas.height - srcY)

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = A4_WIDTH * 2
        pageCanvas.height = A4_HEIGHT * 2

        const ctx = pageCanvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = BG
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          ctx.drawImage(
            canvas,
            0,
            srcY,
            A4_WIDTH * 2,
            srcH,
            0,
            0,
            A4_WIDTH * 2,
            srcH
          )
        }

        const pageImgData = pageCanvas.toDataURL('image/png')
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = 'Nelson_Lamounier_Resume.pdf'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      document.body.removeChild(container)

      trackResumeDownload()
    } catch (error) {
      console.error('Resume PDF generation failed:', error)
      alert('Failed to generate resume PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }, [downloading])

  return (
    <>
      {/* CTA Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white outline-offset-2 transition hover:bg-zinc-700 active:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:active:bg-zinc-100"
      >
        Preview Resume
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="h-4 w-4 stroke-current"
        >
          <path
            d="M5.75 12.25 10 8 5.75 3.75"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          {/* Modal Container */}
          <div className="relative my-8 mx-4 flex flex-col items-center">
            {/* Floating Action Bar */}
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
                      <svg
                        className="h-3.5 w-3.5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray="32"
                          strokeLinecap="round"
                        />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 stroke-current"
                      >
                        <path
                          d="M4.75 8.75 8 12.25m0 0 3.25-3.5M8 12.25v-8.5"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Close preview"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Resume Document (A4 paper) */}
            <div className="rounded-lg shadow-2xl ring-1 ring-black/5">
              <ResumeDocument data={resumeData} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
