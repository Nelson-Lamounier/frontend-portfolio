/**
 * ResumeDocument — Presentational component for PDF capture.
 *
 * Uses INLINE STYLES exclusively (html2canvas does not reliably
 * capture Tailwind utility classes or external stylesheets).
 *
 * Layout: two-column, A4 aspect ratio (210 × 297 mm).
 *   Left  — dark sidebar with contact, skills, certifications, education
 *   Right — white main area with summary, experience, projects
 */

import type { ResumeData } from '@/lib/resume-data'

/* ─── colour tokens ─── */
const SIDEBAR_BG = '#18181b' // zinc-900
const SIDEBAR_TEXT = '#d4d4d8' // zinc-300
const SIDEBAR_HEADING = '#ffffff'
const ACCENT = '#14b8a6' // teal-500
const MAIN_BG = '#ffffff'
const MAIN_TEXT = '#3f3f46' // zinc-700
const MAIN_HEADING = '#18181b' // zinc-900
const MUTED = '#71717a' // zinc-500

/* ─── inline style helpers ─── */
const sidebarSection: React.CSSProperties = {
  marginBottom: 22,
}

const sidebarHeading: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 1.5,
  color: ACCENT,
  marginBottom: 10,
  borderBottom: `1px solid ${ACCENT}`,
  paddingBottom: 4,
}

const mainSectionHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 1.5,
  color: ACCENT,
  marginBottom: 10,
  borderBottom: `2px solid ${ACCENT}`,
  paddingBottom: 4,
}

interface ResumeDocumentProps {
  data: ResumeData
}

export function ResumeDocument({ data }: ResumeDocumentProps) {
  const { profile, summary, experience, certifications, education, projects } = data

  return (
    <div
      style={{
        width: 794, // A4 @ 96 DPI
        minHeight: 1123,
        display: 'flex',
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        background: MAIN_BG,
        color: MAIN_TEXT,
        lineHeight: 1.45,
      }}
    >
      {/* ──────── SIDEBAR ──────── */}
      <div
        style={{
          width: 260,
          background: SIDEBAR_BG,
          color: SIDEBAR_TEXT,
          padding: '30px 22px',
          flexShrink: 0,
        }}
      >
        {/* Name & Title */}
        <div style={{ marginBottom: 24, textAlign: 'center' as const }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {profile.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: SIDEBAR_HEADING, margin: 0 }}>
            {profile.name}
          </h1>
          <p style={{ fontSize: 10, color: ACCENT, marginTop: 4, fontWeight: 600 }}>
            {profile.title}
          </p>
        </div>

        {/* Contact */}
        <div style={sidebarSection}>
          <h2 style={sidebarHeading}>Contact</h2>
          {[
            { icon: '📍', text: profile.location },
            { icon: '✉️', text: profile.email },
            { icon: '🔗', text: profile.linkedin },
            { icon: '💻', text: profile.github },
            { icon: '🌐', text: profile.website },
          ].map((item, i) => (
            <div key={i} style={{ fontSize: 9, marginBottom: 5, display: 'flex', gap: 6 }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>



        {/* Certifications */}
        <div style={sidebarSection}>
          <h2 style={sidebarHeading}>Certifications</h2>
          {certifications.map((cert) => (
            <div key={cert.name} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: SIDEBAR_HEADING }}>
                {cert.name}
              </div>
              <div style={{ fontSize: 8, color: MUTED }}>
                {cert.issuer} · {cert.year}
              </div>
            </div>
          ))}
        </div>

        {/* Education */}
        <div style={sidebarSection}>
          <h2 style={sidebarHeading}>Education</h2>
          {education.map((edu) => (
            <div key={edu.degree} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: SIDEBAR_HEADING }}>
                {edu.degree}
              </div>
              <div style={{ fontSize: 8, color: MUTED }}>{edu.institution}</div>
              <div style={{ fontSize: 8, color: MUTED }}>{edu.period}</div>
              {edu.details && (
                <div style={{ fontSize: 8, color: SIDEBAR_TEXT, marginTop: 2 }}>{edu.details}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ──────── MAIN CONTENT ──────── */}
      <div style={{ flex: 1, padding: '30px 28px' }}>
        {/* Summary */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={mainSectionHeading}>Professional Summary</h2>
          <p style={{ fontSize: 10, lineHeight: 1.6, color: MAIN_TEXT, margin: 0 }}>{summary}</p>
        </div>

        {/* Experience */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={mainSectionHeading}>Professional Experience</h2>
          {experience.map((exp) => (
            <div key={`${exp.company}-${exp.period}`} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: MAIN_HEADING }}>
                    {exp.title}
                  </span>
                  <span style={{ fontSize: 10, color: MUTED }}> — {exp.company}</span>
                </div>
                <span style={{ fontSize: 9, color: MUTED, flexShrink: 0 }}>{exp.period}</span>
              </div>
              <ul
                style={{
                  margin: '4px 0 0 0',
                  paddingLeft: 14,
                  listStyleType: 'disc',
                }}
              >
                {exp.highlights.map((h, i) => (
                  <li key={i} style={{ fontSize: 9, marginBottom: 2, color: MAIN_TEXT }}>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Key Projects */}
        <div>
          <h2 style={mainSectionHeading}>Key Projects</h2>
          {projects.map((proj) => (
            <div
              key={proj.name}
              style={{
                marginBottom: 14,
                borderLeft: `3px solid ${ACCENT}`,
                paddingLeft: 10,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: MAIN_HEADING, marginBottom: 3 }}>
                {proj.name}
              </div>
              <div style={{ fontSize: 8.5, color: MAIN_TEXT, lineHeight: 1.6, marginBottom: 4 }}>
                {proj.description}
              </div>
              <div style={{ fontSize: 8, color: ACCENT }}>
                🔗 {proj.github}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
