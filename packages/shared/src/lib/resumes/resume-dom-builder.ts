/**
 * resume-dom-builder.ts
 *
 * Shared DOM builder for PDF capture. Builds a vanilla DOM element
 * with inline styles that mirrors the ResumeDocument.tsx layout.
 *
 * Used by ResumeDownloadButton and ResumePreview for PDF generation.
 * html2canvas cannot capture Tailwind classes, so inline styles are required.
 *
 * Layout: Two explicit A4 pages with proper margins.
 *   Page 1 — Header, Summary, Achievements, Certifications, Education, Key Projects
 *   Page 2 — Professional Experience, Technical Skills
 */

import type { ResumeData } from './resume-data'

/**
 * Normalise a raw string value into a full href suitable for a PDF link.
 *
 * Rules:
 *   - Already has a scheme (http/https/mailto) → use as-is
 *   - Looks like an email (contains @ but no /) → prepend mailto:
 *   - Otherwise → prepend https://
 */
export function toHref(value: string): string {
  if (!value) return ''
  if (/^(https?:|mailto:)/.test(value)) return value
  if (value.includes('@') && !value.includes('/')) return `mailto:${value}`
  return `https://${value}`
}

/* ─── colour tokens (zinc styling to match ResumeDocument) ─── */
const HEADING = '#18181b'     // zinc-900
const BODY = '#27272a'        // zinc-800
const MUTED = '#52525b'       // zinc-600
const DIVIDER = '#e4e4e7'     // zinc-200
const BG = '#ffffff'
const BODY_LIGHT = '#3f3f46'  // zinc-700

/* ─── A4 dimensions at 96 DPI ─── */
export const A4_WIDTH = 794
export const A4_HEIGHT = 1123
export const PDF_BG = BG

/* ─── Page margins (px) ─── */
export const PAGE_PADDING_TOP = 40
export const PAGE_PADDING_BOTTOM = 40
export const PAGE_PADDING_X = 40

/* ─── inline style helpers ─── */
const sectionHeadingCSS = `
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${HEADING};
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1.5px solid ${DIVIDER};
`

/**
 * Create a single A4 page container with proper margins.
 */
function createPageContainer(): HTMLDivElement {
  const page = document.createElement('div')
  page.style.cssText = `
    width: ${A4_WIDTH}px;
    height: ${A4_HEIGHT}px;
    background: ${BG};
    color: ${BODY};
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    line-height: 1.5;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
  `
  return page
}

/**
 * Build the full resume as a plain DOM element with inline styles.
 * Produces two explicit A4 page containers for clean page breaks.
 */
export function buildResumeDomForPdf(data: ResumeData): HTMLDivElement {
  const root = document.createElement('div')
  root.style.cssText = `
    width: ${A4_WIDTH}px;
    background: ${BG};
  `

  // ═══════════════════════════════════════
  //  PAGE 1
  // ═══════════════════════════════════════
  const page1 = createPageContainer()

  // ──── HEADER ────
  page1.innerHTML = `
    <header style="padding: ${PAGE_PADDING_TOP}px ${PAGE_PADDING_X}px 24px ${PAGE_PADDING_X}px; border-bottom: 1.5px solid #27272a;">
      <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: ${HEADING}; margin: 0;">
        ${data.profile.name}
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 500; color: ${MUTED}; text-transform: uppercase; letter-spacing: 0.8px;">
        ${data.profile.title}
      </p>
      <div style="margin-top: 12px; font-size: 10px; color: ${MUTED}; display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
        <span>${data.profile.location}</span>
        <span style="color: #d4d4d8;">|</span>
        <span data-pdf-link="${toHref(data.profile.email)}">${data.profile.email}</span>
        <span style="color: #d4d4d8;">|</span>
        <span data-pdf-link="${toHref(data.profile.linkedin)}">${data.profile.linkedin}</span>
        <span style="color: #d4d4d8;">|</span>
        <span data-pdf-link="${toHref(data.profile.github)}">${data.profile.github}</span>
        <span style="color: #d4d4d8;">|</span>
        <span data-pdf-link="${toHref(data.profile.website)}">${data.profile.website}</span>
      </div>
    </header>
  `

  // ──── PAGE 1 BODY ────
  const body1 = document.createElement('div')
  body1.style.cssText = `padding: 24px ${PAGE_PADDING_X}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_X}px; box-sizing: border-box;`

  // ──── PROFESSIONAL SUMMARY ────
  body1.innerHTML += `
    <section style="margin-bottom: 24px;">
      <h2 style="${sectionHeadingCSS}">Professional Summary</h2>
      <p style="font-size: 10.5px; line-height: 1.6; color: ${BODY}; margin: 0;">
        ${data.summary}
      </p>
    </section>
  `

  // ──── KEY ACHIEVEMENTS ────
  if (data.keyAchievements && data.keyAchievements.length > 0) {
    const achievementsHtml = data.keyAchievements
      .map(
        (item) => `
      <li style="font-size: 10px; line-height: 1.6; color: ${BODY}; margin-bottom: 6px;">${item.achievement}</li>
    `
      )
      .join('')

    body1.innerHTML += `
      <section style="margin-bottom: 24px;">
        <h2 style="${sectionHeadingCSS}">Key Achievements</h2>
        <ul style="margin: 0; padding-left: 16px; list-style-type: disc;">
          ${achievementsHtml}
        </ul>
      </section>
    `
  }

  // ──── CERTIFICATIONS ────
  if (data.certifications && data.certifications.length > 0) {
    const certsHtml = data.certifications
      .map(
        (cert) => `
      <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 10px; font-weight: 700; color: ${HEADING};">${cert.name}</span>
        <span style="font-size: 9.5px; color: ${MUTED};">${cert.issuer} · ${cert.year}</span>
      </div>
    `
      )
      .join('')

    body1.innerHTML += `
      <section style="margin-bottom: 24px;">
        <h2 style="${sectionHeadingCSS}">Certifications</h2>
        ${certsHtml}
      </section>
    `
  }

  // ──── EDUCATION ────
  if (data.education && data.education.length > 0) {
    const eduHtml = data.education
      .map(
        (edu) => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between;">
          <span style="font-size: 10.5px; font-weight: 700; color: ${HEADING};">${edu.degree}</span>
          <span style="font-size: 9.5px; font-weight: 500; color: ${MUTED}; flex-shrink: 0; margin-left: 16px;">${edu.period}</span>
        </div>
        <p style="font-size: 9.5px; color: ${BODY_LIGHT}; margin: 2px 0 0 0;">${edu.institution}</p>
        ${edu.details ? `<p style="font-size: 9px; color: ${MUTED}; margin: 2px 0 0 0;">${edu.details}</p>` : ''}
      </div>
    `
      )
      .join('')

    body1.innerHTML += `
      <section style="margin-bottom: 24px;">
        <h2 style="${sectionHeadingCSS}">Education</h2>
        ${eduHtml}
      </section>
    `
  }

  // ──── KEY PROJECTS ────
  if (data.projects && data.projects.length > 0) {
    const projectsHtml = data.projects
      .map(
        (proj) => `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between;">
          <h3 style="font-size: 10.5px; font-weight: 700; color: ${HEADING}; margin: 0;">${proj.name}</h3>
          <span data-pdf-link="${toHref(proj.github)}" style="font-size: 9px; color: #71717a; flex-shrink: 0; margin-left: 16px;">${proj.github}</span>
        </div>
        <p style="font-size: 9.5px; line-height: 1.6; color: ${BODY_LIGHT}; margin: 4px 0 0 0;">${proj.description}</p>
      </div>
    `
      )
      .join('')

    body1.innerHTML += `
      <section style="margin-bottom: 24px;">
        <h2 style="${sectionHeadingCSS}">Key Projects</h2>
        ${projectsHtml}
      </section>
    `
  }

  page1.appendChild(body1)

  // Page 1 indicator
  page1.innerHTML += `
    <div style="position: absolute; bottom: 16px; width: 100%; text-align: center; font-size: 8px; color: #a1a1aa;">
      Page 1 of 2
    </div>
  `

  root.appendChild(page1)

  // ═══════════════════════════════════════
  //  PAGE 2
  // ═══════════════════════════════════════
  const page2 = createPageContainer()

  const body2 = document.createElement('div')
  body2.style.cssText = `padding: ${PAGE_PADDING_TOP}px ${PAGE_PADDING_X}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_X}px; box-sizing: border-box;`

  // ──── PROFESSIONAL EXPERIENCE ────
  const experienceHtml = data.experience
    .map(
      (exp) => `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: ${HEADING};">${exp.title}</span>
          <span style="font-size: 10px; font-weight: 500; color: ${MUTED};"> — ${exp.company}</span>
        </div>
        <span style="font-size: 9.5px; font-weight: 500; color: ${MUTED}; flex-shrink: 0; margin-left: 16px;">${exp.period}</span>
      </div>
      <ul style="margin: 6px 0 0 0; padding-left: 16px; list-style-type: disc;">
        ${exp.highlights.map((h) => `<li style="font-size: 9.5px; line-height: 1.5; color: ${BODY_LIGHT}; margin-bottom: 4px;">${h}</li>`).join('')}
      </ul>
    </div>
  `
    )
    .join('')

  body2.innerHTML += `
    <section style="margin-bottom: 24px;">
      <h2 style="${sectionHeadingCSS}">Professional Experience</h2>
      ${experienceHtml}
    </section>
  `

  // ──── TECHNICAL SKILLS ────
  if (data.skills && data.skills.length > 0) {
    const skillsHtml = data.skills
      .map(
        (group) => `
      <div style="break-inside: avoid;">
        <h3 style="font-size: 10px; font-weight: 700; color: ${HEADING}; margin: 0 0 4px 0;">
          ${group.category}
        </h3>
        <p style="font-size: 9.5px; line-height: 1.6; color: ${BODY_LIGHT}; margin: 0;">
          ${group.skills.join(' · ')}
        </p>
      </div>
    `
      )
      .join('')

    body2.innerHTML += `
      <section style="margin-bottom: 24px;">
        <h2 style="${sectionHeadingCSS}">Technical Skills</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px;">
          ${skillsHtml}
        </div>
      </section>
    `
  }

  page2.appendChild(body2)

  // Page 2 indicator
  page2.innerHTML += `
    <div style="position: absolute; bottom: 16px; width: 100%; text-align: center; font-size: 8px; color: #a1a1aa;">
      Page 2 of 2
    </div>
  `

  root.appendChild(page2)

  return root
}
