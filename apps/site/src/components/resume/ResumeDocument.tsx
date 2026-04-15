/**
 * ResumeDocument — Presentational component for resume rendering.
 *
 * Single-column, ATS-friendly layout following industry standards.
 * Guaranteed 2-page A4 layout (794×1123 pixels per page).
 *
 * Used by ResumeSection for on-screen preview inside the modal.
 * The PDF capture mirrors this layout with inline styles via
 * resume-dom-builder (html2canvas cannot capture Tailwind classes).
 *
 * Isolated to apps/site — not shared with start-admin.
 */

import type { ResumeData } from '@/lib/resumes/resume-data'
import { toHref } from '@/lib/resumes/resume-dom-builder'

interface ResumeDocumentProps {
  data: ResumeData
}

export function ResumeDocument({ data }: ResumeDocumentProps) {
  const {
    profile,
    summary,
    keyAchievements,
    skills,
    certifications,
    experience,
    projects,
    education,
  } = data

  return (
    <div className="mx-auto w-[794px] font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] leading-snug">
      {/* ═══════ PAGE 1 ═══════ */}
      <div className="w-[794px] h-[1123px] bg-white text-zinc-900 overflow-hidden relative">
        {/* ── Header ── */}
        <header className="px-10 pt-10 pb-6 border-b-[1.5px] border-zinc-800">
          <h1 className="text-[24px] font-bold tracking-tight text-zinc-900">
            {profile.name}
          </h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-600 tracking-wide uppercase">
            {profile.title}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-600">
            <span>{profile.location}</span>
            <span className="text-zinc-300">|</span>
            <a href={toHref(profile.email)} target="_blank" rel="noopener noreferrer" className="hover:underline">{profile.email}</a>
            <span className="text-zinc-300">|</span>
            <a href={toHref(profile.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline">{profile.linkedin}</a>
            <span className="text-zinc-300">|</span>
            <a href={toHref(profile.github)} target="_blank" rel="noopener noreferrer" className="hover:underline">{profile.github}</a>
            <span className="text-zinc-300">|</span>
            <a href={toHref(profile.website)} target="_blank" rel="noopener noreferrer" className="hover:underline">{profile.website}</a>
          </div>
        </header>

        <div className="px-10 py-6 space-y-6">
          {/* ── Professional Summary ── */}
          <section>
            <SectionHeading>Professional Summary</SectionHeading>
            <p className="text-[10.5px] leading-[1.6] text-zinc-800">{summary}</p>
          </section>

          {/* ── Key Achievements ── */}
          {keyAchievements && keyAchievements.length > 0 && (
            <section>
              <SectionHeading>Key Achievements</SectionHeading>
              <ul className="space-y-1.5 list-disc pl-4">
                {keyAchievements.map((item, i) => (
                  <li key={i} className="text-[10px] leading-[1.6] text-zinc-800">
                    {item.achievement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Certifications ── */}
          {certifications && certifications.length > 0 && (
            <section>
              <SectionHeading>Certifications</SectionHeading>
              <div className="space-y-2">
                {certifications.map((cert) => (
                  <div key={cert.name} className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold text-zinc-900">{cert.name}</span>
                    <span className="text-[9.5px] text-zinc-600">
                      {cert.issuer} · {cert.year}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Education ── */}
          {education && education.length > 0 && (
            <section>
              <SectionHeading>Education</SectionHeading>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.degree}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10.5px] font-bold text-zinc-900">{edu.degree}</span>
                      <span className="text-[9.5px] font-medium text-zinc-600 shrink-0 ml-4">
                        {edu.period}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-zinc-700 mt-0.5">{edu.institution}</p>
                    {edu.details && (
                      <p className="text-[9px] text-zinc-600 mt-0.5">{edu.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Key Projects ── */}
          {projects && projects.length > 0 && (
            <section>
              <SectionHeading>Key Projects</SectionHeading>
              <div className="space-y-4">
                {projects.map((proj) => (
                  <div key={proj.name}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[10.5px] font-bold text-zinc-900">{proj.name}</h3>
                      <a href={toHref(proj.github)} target="_blank" rel="noopener noreferrer" className="text-[9px] text-zinc-500 shrink-0 ml-4 hover:underline">{proj.github}</a>
                    </div>
                    <p className="mt-1 text-[9.5px] leading-[1.6] text-zinc-700">
                      {proj.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="absolute bottom-4 w-full text-center text-[8px] text-zinc-400">
          Page 1 of 2
        </div>
      </div>

      {/* ═══════ PAGE 2 ═══════ */}
      <div className="w-[794px] h-[1123px] bg-white text-zinc-900 overflow-hidden relative">
        <div className="px-10 pt-10 pb-10 space-y-6">
          {/* ── Professional Experience ── */}
          <section>
            <SectionHeading>Professional Experience</SectionHeading>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={`${exp.company}-${exp.period}`}>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-900">{exp.title}</span>
                      <span className="text-[10px] font-medium text-zinc-600"> — {exp.company}</span>
                    </div>
                    <span className="text-[9.5px] font-medium text-zinc-600 shrink-0 ml-4">
                      {exp.period}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1 list-disc pl-4">
                    {exp.highlights.map((h, i) => (
                      <li key={i} className="text-[9.5px] leading-[1.5] text-zinc-700">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ── Technical Skills ── */}
          {skills && skills.length > 0 && (
            <section>
              <SectionHeading>Technical Skills</SectionHeading>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {skills.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[10px] font-bold text-zinc-900 mb-1">{group.category}</h3>
                    <p className="text-[9.5px] leading-[1.6] text-zinc-700">
                      {group.skills.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="absolute bottom-4 w-full text-center text-[8px] text-zinc-400">
          Page 2 of 2
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] font-bold uppercase tracking-[1.5px] text-zinc-900 mb-2.5 pb-1.5 border-b-[1.5px] border-zinc-200">
      {children}
    </h2>
  )
}
