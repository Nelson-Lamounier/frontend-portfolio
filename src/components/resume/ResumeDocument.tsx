/**
 * ResumeDocument — Presentational component for resume rendering.
 *
 * Single-column, ATS-friendly layout following 2026 industry standards
 * for DevOps / Cloud Engineer career-transition resumes.
 *
 * Uses Tailwind CSS for on-screen rendering.
 * The PDF capture in ResumeDownloadButton.tsx mirrors this layout
 * with inline styles (html2canvas cannot capture Tailwind).
 *
 * Color palette: neutral slate two-tone (slate-800 headings, white bg).
 */

import type { ResumeData } from '@/lib/resume-data'

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
    <div className="mx-auto w-[794px] font-['Inter',_'Segoe_UI',_Roboto,_sans-serif] leading-snug">
      {/* ═══════ PAGE 1 ═══════ */}
      <div className="w-[794px] h-[1123px] bg-white text-slate-700 overflow-hidden">
        {/* ──── HEADER ──── */}
        <header className="px-10 pt-8 pb-5 border-b-2 border-slate-800">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-800">
            {profile.name}
          </h1>
          <p className="mt-0.5 text-[12px] font-semibold text-slate-500 tracking-wide uppercase">
            {profile.title}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-1 text-[9px] text-slate-500">
            <span>{profile.location}</span>
            <span className="text-slate-300">|</span>
            <span>{profile.email}</span>
            <span className="text-slate-300">|</span>
            <span>{profile.linkedin}</span>
            <span className="text-slate-300">|</span>
            <span>{profile.github}</span>
            <span className="text-slate-300">|</span>
            <span>{profile.website}</span>
          </div>
        </header>

        <div className="px-10 py-5 space-y-5">
          {/* ──── PROFESSIONAL SUMMARY ──── */}
          <section>
            <SectionHeading>Professional Summary</SectionHeading>
            <p className="text-[10px] leading-relaxed text-slate-700">
              {summary}
            </p>
          </section>

          {/* ──── KEY ACHIEVEMENTS ──── */}
          {keyAchievements && keyAchievements.length > 0 && (
            <section>
              <SectionHeading>Key Achievements</SectionHeading>
              <ul className="space-y-1 list-disc pl-3.5">
                {keyAchievements.map((item, i) => (
                  <li
                    key={i}
                    className="text-[9px] leading-relaxed text-slate-600"
                  >
                    {item.achievement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ──── TECHNICAL SKILLS ──── */}
          {skills && skills.length > 0 && (
            <section>
              <SectionHeading>Technical Skills</SectionHeading>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {skills.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                      {group.category}
                    </h3>
                    <p className="text-[9px] leading-relaxed text-slate-600">
                      {group.skills.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ──── CERTIFICATION ──── */}
          {certifications && certifications.length > 0 && (
            <section>
              <SectionHeading>Certification</SectionHeading>
              <div className="space-y-1">
                {certifications.map((cert) => (
                  <div
                    key={cert.name}
                    className="flex items-baseline justify-between"
                  >
                    <span className="text-[9.5px] font-semibold text-slate-800">
                      {cert.name}
                    </span>
                    <span className="text-[8.5px] text-slate-500">
                      {cert.issuer} · {cert.year}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ──── EDUCATION ──── */}
          {education && education.length > 0 && (
            <section>
              <SectionHeading>Education</SectionHeading>
              <div className="space-y-2">
                {education.map((edu) => (
                  <div key={edu.degree}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[9.5px] font-semibold text-slate-800">
                        {edu.degree}
                      </span>
                      <span className="text-[8.5px] text-slate-500 shrink-0 ml-4">
                        {edu.period}
                      </span>
                    </div>
                    <p className="text-[8.5px] text-slate-500">
                      {edu.institution}
                    </p>
                    {edu.details && (
                      <p className="text-[8.5px] text-slate-600 mt-0.5">
                        {edu.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ──── KEY PROJECTS ──── */}
          {projects && projects.length > 0 && (
            <section>
              <SectionHeading>Key Projects</SectionHeading>
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.name}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[10px] font-bold text-slate-800">
                        {proj.name}
                      </h3>
                      <span className="text-[8px] text-slate-500 shrink-0 ml-4">
                        {proj.github}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[8.5px] leading-relaxed text-slate-600">
                      {proj.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ═══════ PAGE 2 ═══════ */}
      <div className="w-[794px] h-[1123px] bg-white text-slate-700 overflow-hidden">
        <div className="px-10 pt-8 pb-8 space-y-5">
          {/* ──── PROFESSIONAL EXPERIENCE ──── */}
          <section>
            <SectionHeading>Professional Experience</SectionHeading>
            <div className="space-y-3">
              {experience.map((exp) => (
                <div key={`${exp.company}-${exp.period}`}>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-800">
                        {exp.title}
                      </span>
                      <span className="text-[9.5px] text-slate-500">
                        {' '}
                        — {exp.company}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-slate-500 shrink-0 ml-4">
                      {exp.period}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5 list-disc pl-3.5">
                    {exp.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="text-[8.5px] leading-relaxed text-slate-600"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>


        </div>
      </div>
    </div>
  )
}

/* ─── Shared section heading ─── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[1.5px] text-slate-800 mb-2 pb-1 border-b border-slate-300">
      {children}
    </h2>
  )
}
