import { useCallback, useState } from 'react'
import { A4_WIDTH, A4_HEIGHT, PDF_BG } from '@/lib/resumes/resume-dom-builder'
import { useToastStore } from '@/lib/stores/toast-store'

/**
 * Shared PDF generation hook.
 *
 * Accepts a factory function that produces the DOM element to capture.
 * Handles html2canvas capture, jsPDF page slicing, link overlays, and download.
 */
export function usePdfDownload() {
  const [downloading, setDownloading] = useState(false)
  const { addToast } = useToastStore()

  const generatePdf = useCallback(
    async (buildEl: () => HTMLElement, filename: string) => {
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

        const el = buildEl()
        container.appendChild(el)

        await new Promise((r) => requestAnimationFrame(r))
        await new Promise((r) => setTimeout(r, 200))

        const actualHeight = el.scrollHeight

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: PDF_BG,
          width: A4_WIDTH,
          height: actualHeight,
          onclone: (clonedDoc: Document) => {
            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => s.remove())
          },
        })

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        const pageCount = Math.max(1, Math.round(actualHeight / A4_HEIGHT))

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

        // Overlay clickable link annotations
        const rootRect = el.getBoundingClientRect()
        const xScale = pdfWidth / A4_WIDTH
        const yScale = pdfHeight / A4_HEIGHT

        el.querySelectorAll<HTMLElement>('[data-pdf-link]').forEach((linkEl) => {
          const href = linkEl.dataset.pdfLink
          if (!href) return
          const rect = linkEl.getBoundingClientRect()
          const relX = rect.left - rootRect.left
          const relY = rect.top - rootRect.top
          const pageIndex = Math.floor(relY / A4_HEIGHT)
          const yOnPage = relY - pageIndex * A4_HEIGHT
          pdf.setPage(pageIndex + 1)
          pdf.link(relX * xScale, yOnPage * yScale, rect.width * xScale, rect.height * yScale, { url: href })
        })

        const blobUrl = URL.createObjectURL(pdf.output('blob'))
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } catch (err) {
        addToast('error', `PDF generation failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      } finally {
        if (container?.parentNode) document.body.removeChild(container)
        setDownloading(false)
      }
    },
    [downloading, addToast],
  )

  return { downloading, generatePdf }
}
