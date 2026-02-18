'use client'

/**
 * ResumeDownloadButton
 *
 * Client component that generates a PDF resume on-the-fly by:
 *   1. Building the resume layout as a DOM element (no React render needed)
 *   2. Capturing it with html2canvas at 2× resolution
 *   3. Converting the canvas to an A4 PDF via jsPDF
 *   4. Triggering a browser download
 *   5. Firing a GA resume_download event
 */

import { useCallback, useState } from 'react'
import { resumeData } from '@/lib/resume-data'
import { trackResumeDownload } from '@/lib/analytics'

/* ─── colour tokens ─── */
const SIDEBAR_BG = '#18181b'
const SIDEBAR_TEXT = '#d4d4d8'
const SIDEBAR_HEADING = '#ffffff'
const ACCENT = '#14b8a6'
const MAIN_BG = '#ffffff'
const MAIN_TEXT = '#3f3f46'
const MAIN_HEADING = '#18181b'
const MUTED = '#71717a'

/**
 * Build the full resume as a plain DOM element.
 * Uses inline styles so html2canvas captures everything faithfully.
 */
function buildResumeDom(): HTMLDivElement {
  const data = resumeData

  const root = document.createElement('div')
  root.style.cssText = `
    width: 794px;
    min-height: 1123px;
    display: flex;
    font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: ${MAIN_BG};
    color: ${MAIN_TEXT};
    line-height: 1.45;
  `

  // ──── SIDEBAR ────
  const sidebar = document.createElement('div')
  sidebar.style.cssText = `
    width: 260px;
    background: ${SIDEBAR_BG};
    color: ${SIDEBAR_TEXT};
    padding: 30px 22px;
    flex-shrink: 0;
    box-sizing: border-box;
  `

  // Initials avatar
  const initials = data.profile.name.split(' ').map(n => n[0]).join('')
  sidebar.innerHTML = `
    <div style="margin-bottom:24px;text-align:center;">
      <div style="width:80px;height:80px;border-radius:50%;background:${ACCENT};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;font-weight:700;color:#fff;">${initials}</div>
      <h1 style="font-size:18px;font-weight:700;color:${SIDEBAR_HEADING};margin:0;">${data.profile.name}</h1>
      <p style="font-size:10px;color:${ACCENT};margin-top:4px;font-weight:600;">${data.profile.title}</p>
    </div>

    <!-- Contact -->
    <div style="margin-bottom:22px;">
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${ACCENT};margin-bottom:10px;border-bottom:1px solid ${ACCENT};padding-bottom:4px;">Contact</h2>
      <div style="font-size:9px;margin-bottom:5px;">📍 ${data.profile.location}</div>
      <div style="font-size:9px;margin-bottom:5px;">✉️ ${data.profile.email}</div>
      <div style="font-size:9px;margin-bottom:5px;">🔗 ${data.profile.linkedin}</div>
      <div style="font-size:9px;margin-bottom:5px;">💻 ${data.profile.github}</div>
      <div style="font-size:9px;margin-bottom:5px;">🌐 ${data.profile.website}</div>
    </div>



    <!-- Certifications -->
    <div style="margin-bottom:22px;">
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${ACCENT};margin-bottom:10px;border-bottom:1px solid ${ACCENT};padding-bottom:4px;">Certifications</h2>
      ${data.certifications
        .map(
          (cert) => `
        <div style="margin-bottom:8px;">
          <div style="font-size:9px;font-weight:600;color:${SIDEBAR_HEADING};">${cert.name}</div>
          <div style="font-size:8px;color:${MUTED};">${cert.issuer} · ${cert.year}</div>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- Education -->
    <div style="margin-bottom:22px;">
      <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${ACCENT};margin-bottom:10px;border-bottom:1px solid ${ACCENT};padding-bottom:4px;">Education</h2>
      ${data.education
        .map(
          (edu) => `
        <div style="margin-bottom:8px;">
          <div style="font-size:9px;font-weight:600;color:${SIDEBAR_HEADING};">${edu.degree}</div>
          <div style="font-size:8px;color:${MUTED};">${edu.institution}</div>
          <div style="font-size:8px;color:${MUTED};">${edu.period}</div>
          ${edu.details ? `<div style="font-size:8px;color:${SIDEBAR_TEXT};margin-top:2px;">${edu.details}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `

  // ──── MAIN CONTENT ────
  const main = document.createElement('div')
  main.style.cssText = `flex: 1; padding: 30px 28px; box-sizing: border-box;`

  const sectionHeadingCSS = `font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${ACCENT};margin-bottom:10px;border-bottom:2px solid ${ACCENT};padding-bottom:4px;`

  main.innerHTML = `
    <!-- Summary -->
    <div style="margin-bottom:20px;">
      <h2 style="${sectionHeadingCSS}">Professional Summary</h2>
      <p style="font-size:10px;line-height:1.6;color:${MAIN_TEXT};margin:0;">${data.summary}</p>
    </div>

    <!-- Experience -->
    <div style="margin-bottom:20px;">
      <h2 style="${sectionHeadingCSS}">Professional Experience</h2>
      ${data.experience
        .map(
          (exp) => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div>
              <span style="font-size:11px;font-weight:700;color:${MAIN_HEADING};">${exp.title}</span>
              <span style="font-size:10px;color:${MUTED};"> — ${exp.company}</span>
            </div>
            <span style="font-size:9px;color:${MUTED};flex-shrink:0;">${exp.period}</span>
          </div>
          <ul style="margin:4px 0 0 0;padding-left:14px;list-style-type:disc;">
            ${exp.highlights.map((h) => `<li style="font-size:9px;margin-bottom:2px;color:${MAIN_TEXT};">${h}</li>`).join('')}
          </ul>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- Key Projects -->
    <div>
      <h2 style="${sectionHeadingCSS}">Key Projects</h2>
      ${data.projects
        .map(
          (proj) => `
        <div style="margin-bottom:14px;border-left:3px solid ${ACCENT};padding-left:10px;">
          <div style="font-size:10px;font-weight:700;color:${MAIN_HEADING};margin-bottom:3px;">${proj.name}</div>
          <div style="font-size:8.5px;color:${MAIN_TEXT};line-height:1.6;margin-bottom:4px;">${proj.description}</div>
          <div style="font-size:8px;color:${ACCENT};">🔗 ${proj.github}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `

  root.appendChild(sidebar)
  root.appendChild(main)
  return root
}

export function ResumeDownloadButton() {
  const [generating, setGenerating] = useState(false)

  const handleDownload = useCallback(async () => {
    if (generating) return
    setGenerating(true)

    let container: HTMLDivElement | null = null

    try {
      // Dynamically import libraries (ensures proper webpack bundling)
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule

      // 1. Build & mount the resume DOM off-screen
      container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.zIndex = '-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDom()
      container.appendChild(resumeEl)

      // Let the browser lay out the element
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      // 2. Capture with html2canvas at high resolution
      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      })

      // 3. Generate PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      // Use blob URL + anchor click for reliable download
      // (pdf.save() can be blocked by popup blockers in async contexts)
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = 'Nelson_Lamounier_Resume.pdf'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      // Revoke the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      // 4. GA tracking
      trackResumeDownload()
    } catch (error) {
      console.error('Resume PDF generation failed:', error)
      alert('Failed to generate resume PDF. Please try again.')
    } finally {
      // Cleanup
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
