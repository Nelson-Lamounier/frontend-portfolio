'use client'

/**
 * ResumeDownloadButton
 *
 * Client component that generates a PDF resume on-the-fly by:
 *   1. Building the resume layout as a DOM element with inline styles
 *   2. Capturing it with html2canvas at 2× resolution
 *   3. Slicing the canvas into A4 pages via jsPDF (multi-page support)
 *   4. Triggering a browser download
 *   5. Firing a GA resume_download event
 */

import { useCallback, useState } from 'react'
import { resumeDataFullstack as resumeData } from '../../lib/resumes/resume-data-fullstack'
import { trackResumeDownload } from '../../lib/observability/analytics'

export function ResumeDownloadButton() {
  const [generating, setGenerating] = useState(false)

  const handleDownload = useCallback(async () => {
    if (generating) return
    setGenerating(true)

    let container: HTMLDivElement | null = null

    try {
      const [html2canvasModule, jspdfModule, domBuilderModule] =
        await Promise.all([
          import('html2canvas'),
          import('jspdf'),
          import('../../lib/resumes/resume-dom-builder'),
        ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule
      const { buildResumeDomForPdf, A4_WIDTH, A4_HEIGHT, PDF_BG } =
        domBuilderModule

      // 1. Build & mount the resume DOM off-screen
      container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.zIndex = '-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDomForPdf(resumeData)
      container.appendChild(resumeEl)

      // Let the browser lay out the element
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      // 2. Capture with html2canvas at high resolution (full height)
      const actualHeight = resumeEl.scrollHeight
      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: PDF_BG,
        width: A4_WIDTH,
        height: actualHeight,
      })

      // 3. Generate multi-page PDF
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

      // 4. Download using blob URL
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = 'Nelson_Lamounier_Resume.pdf'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      // 5. GA tracking
      trackResumeDownload()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Resume PDF generation failed:', error)
      alert('Failed to generate resume PDF. Please try again.')
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container)
      }
      setGenerating(false)
    }
  }, [generating])

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-offset-2 transition hover:bg-zinc-100 active:bg-zinc-100 active:text-zinc-900/60 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:active:bg-zinc-800/50 dark:active:text-zinc-50/70"
    >
      {generating ? (
        <>
          <svg
            className="h-4 w-4 animate-spin stroke-zinc-400"
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
          Download CV
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4 stroke-zinc-400 transition group-active:stroke-zinc-600 dark:group-hover:stroke-zinc-50 dark:group-active:stroke-zinc-50"
          >
            <path
              d="M4.75 8.75 8 12.25m0 0 3.25-3.5M8 12.25v-8.5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
    </button>
  )
}
