/**
 * resume-dom-builder.ts
 *
 * Shared DOM builder for PDF capture. Builds a vanilla DOM element
 * with inline styles that mirrors the ResumeDocument.tsx Tailwind layout.
 *
 * Used by both ResumeDownloadButton and ResumePreview for PDF generation.
 * html2canvas cannot capture Tailwind classes, so inline styles are required.
 */

import type { ResumeData } from '@/lib/resume-data'

/* ─── colour tokens (slate two-tone) ─── */
const HEADING = '#1e293b'
const BODY = '#334155'
const MUTED = '#64748b'
const DIVIDER = '#cbd5e1'
const BG = '#ffffff'
const BODY_LIGHT = '#475569'

/* ─── A4 dimensions at 96 DPI ─── */
export const A4_WIDTH = 794
export const A4_HEIGHT = 1123
export const PDF_BG = BG

/* ─── inline style helpers ─── */
const sectionHeadingCSS = `
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${HEADING};
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid ${DIVIDER};
`

/**
 * Build the full resume as a plain DOM element with inline styles.
 * Mirrors the layout of ResumeDocument.tsx exactly.
 */
export function buildResumeDomForPdf(data: ResumeData): HTMLDivElement {
  const root = document.createElement('div')
  root.style.cssText = `
    width: ${A4_WIDTH}px;
    min-height: ${A4_HEIGHT}px;
    background: ${BG};
    color: ${BODY};
    font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
    line-height: 1.4;
    box-sizing: border-box;
  `

  // ──── HEADER ────
  root.innerHTML = `
    <header style="padding: 32px 40px 20px 40px; border-bottom: 2px solid ${HEADING};">
      <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.3px; color: ${HEADING}; margin: 0;">
        ${data.profile.name}
      </h1>
      <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: ${MUTED}; text-transform: uppercase; letter-spacing: 0.8px;">
        ${data.profile.title}
      </p>
      <div style="margin-top: 10px; font-size: 9px; color: ${MUTED}; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">
        <span>${data.profile.location}</span>
        <span style="color: ${DIVIDER};">|</span>
        <span>${data.profile.email}</span>
        <span style="color: ${DIVIDER};">|</span>
        <span>${data.profile.linkedin}</span>
        <span style="color: ${DIVIDER};">|</span>
        <span>${data.profile.github}</span>
        <span style="color: ${DIVIDER};">|</span>
        <span>${data.profile.website}</span>
      </div>
    </header>
  `

  // ──── BODY CONTAINER ────
  const body = document.createElement('div')
  body.style.cssText = `padding: 20px 40px; box-sizing: border-box;`

  // ──── PROFESSIONAL SUMMARY ────
  body.innerHTML += `
    <section style="margin-bottom: 20px;">
      <h2 style="${sectionHeadingCSS}">Professional Summary</h2>
      <p style="font-size: 9.5px; line-height: 1.65; color: ${BODY}; margin: 0;">
        ${data.summary}
      </p>
    </section>
  `

  // ──── TECHNICAL SKILLS (2-column grid) ────
  if (data.skills && data.skills.length > 0) {
    const skillsHtml = data.skills
      .map(
        (group) => `
      <div style="break-inside: avoid;">
        <h3 style="font-size: 9px; font-weight: 700; color: ${HEADING}; margin: 0 0 2px 0;">
          ${group.category}
        </h3>
        <p style="font-size: 8.5px; line-height: 1.6; color: ${BODY_LIGHT}; margin: 0;">
          ${group.skills.join(' · ')}
        </p>
      </div>
    `
      )
      .join('')

    body.innerHTML += `
      <section style="margin-bottom: 20px;">
        <h2 style="${sectionHeadingCSS}">Technical Skills</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px;">
          ${skillsHtml}
        </div>
      </section>
    `
  }

  // ──── CERTIFICATION ────
  if (data.certifications && data.certifications.length > 0) {
    const certsHtml = data.certifications
      .map(
        (cert) => `
      <div style="display: flex; align-items: baseline; justify-content: space-between;">
        <span style="font-size: 9.5px; font-weight: 600; color: ${HEADING};">${cert.name}</span>
        <span style="font-size: 8.5px; color: ${MUTED};">${cert.issuer} · ${cert.year}</span>
      </div>
    `
      )
      .join('')

    body.innerHTML += `
      <section style="margin-bottom: 20px;">
        <h2 style="${sectionHeadingCSS}">Certification</h2>
        ${certsHtml}
      </section>
    `
  }

  // ──── KEY PROJECTS ────
  if (data.projects && data.projects.length > 0) {
    const projectsHtml = data.projects
      .map(
        (proj) => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between;">
          <h3 style="font-size: 10px; font-weight: 700; color: ${HEADING}; margin: 0;">${proj.name}</h3>
          <span style="font-size: 8px; color: ${MUTED}; flex-shrink: 0; margin-left: 16px;">${proj.github}</span>
        </div>
        <p style="font-size: 8.5px; line-height: 1.6; color: ${BODY_LIGHT}; margin: 2px 0 0 0;">${proj.description}</p>
      </div>
    `
      )
      .join('')

    body.innerHTML += `
      <section style="margin-bottom: 20px;">
        <h2 style="${sectionHeadingCSS}">Key Projects</h2>
        ${projectsHtml}
      </section>
    `
  }

  // ──── PROFESSIONAL EXPERIENCE ────
  const experienceHtml = data.experience
    .map(
      (exp) => `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between;">
        <div>
          <span style="font-size: 10px; font-weight: 700; color: ${HEADING};">${exp.title}</span>
          <span style="font-size: 9.5px; color: ${MUTED};"> — ${exp.company}</span>
        </div>
        <span style="font-size: 8.5px; color: ${MUTED}; flex-shrink: 0; margin-left: 16px;">${exp.period}</span>
      </div>
      <ul style="margin: 4px 0 0 0; padding-left: 14px; list-style-type: disc;">
        ${exp.highlights.map((h) => `<li style="font-size: 8.5px; line-height: 1.6; color: ${BODY_LIGHT}; margin-bottom: 2px;">${h}</li>`).join('')}
      </ul>
    </div>
  `
    )
    .join('')

  body.innerHTML += `
    <section style="margin-bottom: 20px;">
      <h2 style="${sectionHeadingCSS}">Professional Experience</h2>
      ${experienceHtml}
    </section>
  `

  // ──── EDUCATION ────
  if (data.education && data.education.length > 0) {
    const eduHtml = data.education
      .map(
        (edu) => `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between;">
          <span style="font-size: 9.5px; font-weight: 600; color: ${HEADING};">${edu.degree}</span>
          <span style="font-size: 8.5px; color: ${MUTED}; flex-shrink: 0; margin-left: 16px;">${edu.period}</span>
        </div>
        <p style="font-size: 8.5px; color: ${MUTED}; margin: 0;">${edu.institution}</p>
        ${edu.details ? `<p style="font-size: 8.5px; color: ${BODY_LIGHT}; margin: 2px 0 0 0;">${edu.details}</p>` : ''}
      </div>
    `
      )
      .join('')

    body.innerHTML += `
      <section style="margin-bottom: 20px;">
        <h2 style="${sectionHeadingCSS}">Education</h2>
        ${eduHtml}
      </section>
    `
  }

  root.appendChild(body)
  return root
}
