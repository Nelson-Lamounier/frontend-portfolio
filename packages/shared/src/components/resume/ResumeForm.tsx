/**
 * ResumeForm — Shared Create/Edit Form
 *
 * Multi-section form for editing ResumeData. Used by both
 * the create (/admin/resumes/new) and edit (/admin/resumes/edit/[id]) pages.
 *
 * Each section (profile, summary, experience, skills, education,
 * certifications, projects, achievements) is collapsible and
 * supports dynamic add/remove of list items.
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type {
  ResumeData,
  ResumeProfile,
  ResumeExperience,
  ResumeCertification,
  ResumeEducation,
  ResumeSkillGroup,
  ResumeProject,
  ResumeAchievement,
} from '../../lib/resumes/resume-data'

// =============================================================================
// TYPES
// =============================================================================

interface ResumeFormProps {
  /** Form mode */
  mode: 'create' | 'edit'
  /** Resume ID (only for edit mode) */
  resumeId?: string
  /** Initial label */
  initialLabel?: string
  /** Initial resume data */
  initialData?: ResumeData
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultProfile: ResumeProfile = {
  name: '',
  title: '',
  location: '',
  email: '',
  linkedin: '',
  github: '',
  website: '',
}

const defaultExperience: ResumeExperience = {
  company: '',
  title: '',
  period: '',
  highlights: [''],
}

const defaultCertification: ResumeCertification = {
  name: '',
  issuer: '',
  year: '',
}

const defaultEducation: ResumeEducation = {
  degree: '',
  institution: '',
  period: '',
}

const defaultSkillGroup: ResumeSkillGroup = {
  category: '',
  skills: [''],
}

const defaultProject: ResumeProject = {
  name: '',
  description: '',
  github: '',
}

const defaultAchievement: ResumeAchievement = {
  achievement: '',
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Multi-section resume form with dynamic list management.
 *
 * @param props - Form configuration and initial data
 * @returns Resume form JSX
 */
export function ResumeForm({
  mode,
  resumeId,
  initialLabel = '',
  initialData,
}: ResumeFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [label, setLabel] = useState(initialLabel)
  const [profile, setProfile] = useState<ResumeProfile>(
    initialData?.profile ?? { ...defaultProfile },
  )
  const [summary, setSummary] = useState(initialData?.summary ?? '')
  const [keyAchievements, setKeyAchievements] = useState<ResumeAchievement[]>(
    initialData?.keyAchievements ?? [{ ...defaultAchievement }],
  )
  const [experience, setExperience] = useState<ResumeExperience[]>(
    initialData?.experience ?? [{ ...defaultExperience, highlights: [''] }],
  )
  const [certifications, setCertifications] = useState<ResumeCertification[]>(
    initialData?.certifications ?? [{ ...defaultCertification }],
  )
  const [skills, setSkills] = useState<ResumeSkillGroup[]>(
    initialData?.skills ?? [{ ...defaultSkillGroup, skills: [''] }],
  )
  const [education, setEducation] = useState<ResumeEducation[]>(
    initialData?.education ?? [{ ...defaultEducation }],
  )
  const [projects, setProjects] = useState<ResumeProject[]>(
    initialData?.projects ?? [{ ...defaultProject }],
  )

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    profile: true,
    summary: true,
    achievements: false,
    experience: false,
    certifications: false,
    skills: false,
    education: false,
    projects: false,
  })

  /**
   * Toggles a section's collapsed state.
   */
  const toggleSection = useCallback((section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  /**
   * Submits the form — creates or updates the resume.
   */
  const handleSubmit = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)

    // Filter out empty items
    const cleanedAchievements = keyAchievements.filter((a) => a.achievement.trim())
    const cleanedExperience = experience
      .filter((e) => e.company.trim())
      .map((e) => ({ ...e, highlights: e.highlights.filter((h) => h.trim()) }))
    const cleanedCertifications = certifications.filter((c) => c.name.trim())
    const cleanedSkills = skills
      .filter((s) => s.category.trim())
      .map((s) => ({ ...s, skills: s.skills.filter((sk) => sk.trim()) }))
    const cleanedEducation = education.filter((e) => e.degree.trim())
    const cleanedProjects = projects.filter((p) => p.name.trim())

    const data: ResumeData = {
      profile,
      summary,
      keyAchievements: cleanedAchievements,
      experience: cleanedExperience,
      certifications: cleanedCertifications,
      skills: cleanedSkills,
      education: cleanedEducation,
      projects: cleanedProjects,
    }

    try {
      const url = mode === 'create'
        ? '/api/admin/resumes'
        : `/api/admin/resumes/${resumeId}`

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, data }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      router.push('/admin/resumes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resume')
    } finally {
      setSaving(false)
    }
  }, [
    saving, mode, resumeId, label, profile, summary,
    keyAchievements, experience, certifications, skills,
    education, projects, router,
  ])

  // =========================================================================
  // Section Header Component
  // =========================================================================

  const SectionHeader = ({ id, title, count }: { id: string; title: string; count?: number }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="flex w-full items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
    >
      <span>
        {title}
        {count !== undefined && (
          <span className="ml-2 text-xs font-normal text-zinc-500">({count})</span>
        )}
      </span>
      <svg
        className={`h-4 w-4 transition-transform ${openSections[id] ? 'rotate-180' : ''}`}
        fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>
  )

  // =========================================================================
  // Render
  // =========================================================================

  const inputClasses = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500'
  const textareaClasses = `${inputClasses} min-h-[100px] resize-y`
  const labelClasses = 'block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1'
  const addBtnClasses = 'inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-400 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-teal-500 hover:text-teal-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-teal-500 dark:hover:text-teal-400'
  const removeBtnClasses = 'rounded p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {mode === 'create' ? 'Create Resume' : 'Edit Resume'}
        </h1>
        <button
          type="button"
          onClick={() => router.push('/admin/resumes')}
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Back
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Label */}
      <div className="mt-6">
        <label className={labelClasses} htmlFor="resume-label">Resume Label</label>
        <input
          id="resume-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. DevOps Engineer, Full Stack Developer"
          className={inputClasses}
        />
      </div>

      <div className="mt-6 space-y-4">
        {/* ──────────── PROFILE ──────────── */}
        <div>
          <SectionHeader id="profile" title="Profile" />
          {openSections.profile && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(defaultProfile) as Array<keyof ResumeProfile>).map((field) => (
                <div key={field}>
                  <label className={labelClasses} htmlFor={`profile-${field}`}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <input
                    id={`profile-${field}`}
                    type="text"
                    value={profile[field]}
                    onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                    className={inputClasses}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ──────────── SUMMARY ──────────── */}
        <div>
          <SectionHeader id="summary" title="Summary" />
          {openSections.summary && (
            <div className="mt-3">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Professional summary..."
                className={textareaClasses}
                rows={4}
              />
            </div>
          )}
        </div>

        {/* ──────────── KEY ACHIEVEMENTS ──────────── */}
        <div>
          <SectionHeader id="achievements" title="Key Achievements" count={keyAchievements.length} />
          {openSections.achievements && (
            <div className="mt-3 space-y-2">
              {keyAchievements.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={a.achievement}
                    onChange={(e) => {
                      const updated = [...keyAchievements]
                      updated[i] = { achievement: e.target.value }
                      setKeyAchievements(updated)
                    }}
                    className={`${inputClasses} min-h-[60px]`}
                    placeholder="Achievement..."
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() => setKeyAchievements(keyAchievements.filter((_, idx) => idx !== i))}
                    className={removeBtnClasses}
                  >✕</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setKeyAchievements([...keyAchievements, { ...defaultAchievement }])}
                className={addBtnClasses}
              >+ Add Achievement</button>
            </div>
          )}
        </div>

        {/* ──────────── EXPERIENCE ──────────── */}
        <div>
          <SectionHeader id="experience" title="Experience" count={experience.length} />
          {openSections.experience && (
            <div className="mt-3 space-y-6">
              {experience.map((exp, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">Experience {i + 1}</span>
                    <button type="button" onClick={() => setExperience(experience.filter((_, idx) => idx !== i))} className={removeBtnClasses}>✕</button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClasses}>Company</label>
                      <input type="text" value={exp.company} onChange={(e) => { const u = [...experience]; u[i] = { ...u[i], company: e.target.value }; setExperience(u) }} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Title</label>
                      <input type="text" value={exp.title} onChange={(e) => { const u = [...experience]; u[i] = { ...u[i], title: e.target.value }; setExperience(u) }} className={inputClasses} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClasses}>Period</label>
                      <input type="text" value={exp.period} onChange={(e) => { const u = [...experience]; u[i] = { ...u[i], period: e.target.value }; setExperience(u) }} className={inputClasses} placeholder="e.g. 2022 – Present" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={labelClasses}>Highlights</label>
                    <div className="space-y-2">
                      {exp.highlights.map((h, hi) => (
                        <div key={hi} className="flex gap-2">
                          <textarea value={h} onChange={(e) => { const u = [...experience]; const hl = [...u[i].highlights]; hl[hi] = e.target.value; u[i] = { ...u[i], highlights: hl }; setExperience(u) }} className={`${inputClasses} min-h-[50px]`} rows={2} />
                          <button type="button" onClick={() => { const u = [...experience]; u[i] = { ...u[i], highlights: u[i].highlights.filter((_, idx) => idx !== hi) }; setExperience(u) }} className={removeBtnClasses}>✕</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => { const u = [...experience]; u[i] = { ...u[i], highlights: [...u[i].highlights, ''] }; setExperience(u) }} className={addBtnClasses}>+ Add Highlight</button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setExperience([...experience, { ...defaultExperience, highlights: [''] }])} className={addBtnClasses}>+ Add Experience</button>
            </div>
          )}
        </div>

        {/* ──────────── CERTIFICATIONS ──────────── */}
        <div>
          <SectionHeader id="certifications" title="Certifications" count={certifications.length} />
          {openSections.certifications && (
            <div className="mt-3 space-y-3">
              {certifications.map((cert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-3 gap-2">
                    <input type="text" value={cert.name} onChange={(e) => { const u = [...certifications]; u[i] = { ...u[i], name: e.target.value }; setCertifications(u) }} className={inputClasses} placeholder="Certification name" />
                    <input type="text" value={cert.issuer} onChange={(e) => { const u = [...certifications]; u[i] = { ...u[i], issuer: e.target.value }; setCertifications(u) }} className={inputClasses} placeholder="Issuer" />
                    <input type="text" value={cert.year} onChange={(e) => { const u = [...certifications]; u[i] = { ...u[i], year: e.target.value }; setCertifications(u) }} className={inputClasses} placeholder="Year" />
                  </div>
                  <button type="button" onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))} className={removeBtnClasses}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setCertifications([...certifications, { ...defaultCertification }])} className={addBtnClasses}>+ Add Certification</button>
            </div>
          )}
        </div>

        {/* ──────────── SKILLS ──────────── */}
        <div>
          <SectionHeader id="skills" title="Skills" count={skills.length} />
          {openSections.skills && (
            <div className="mt-3 space-y-4">
              {skills.map((group, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="mb-2 flex items-center justify-between">
                    <input type="text" value={group.category} onChange={(e) => { const u = [...skills]; u[i] = { ...u[i], category: e.target.value }; setSkills(u) }} className={inputClasses} placeholder="Category (e.g. Cloud & Infrastructure)" />
                    <button type="button" onClick={() => setSkills(skills.filter((_, idx) => idx !== i))} className={`${removeBtnClasses} ml-2`}>✕</button>
                  </div>
                  <div className="space-y-1">
                    {group.skills.map((skill, si) => (
                      <div key={si} className="flex gap-2">
                        <input type="text" value={skill} onChange={(e) => { const u = [...skills]; const sk = [...u[i].skills]; sk[si] = e.target.value; u[i] = { ...u[i], skills: sk }; setSkills(u) }} className={inputClasses} placeholder="Skill..." />
                        <button type="button" onClick={() => { const u = [...skills]; u[i] = { ...u[i], skills: u[i].skills.filter((_, idx) => idx !== si) }; setSkills(u) }} className={removeBtnClasses}>✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => { const u = [...skills]; u[i] = { ...u[i], skills: [...u[i].skills, ''] }; setSkills(u) }} className={addBtnClasses}>+ Add Skill</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setSkills([...skills, { ...defaultSkillGroup, skills: [''] }])} className={addBtnClasses}>+ Add Skill Group</button>
            </div>
          )}
        </div>

        {/* ──────────── EDUCATION ──────────── */}
        <div>
          <SectionHeader id="education" title="Education" count={education.length} />
          {openSections.education && (
            <div className="mt-3 space-y-3">
              {education.map((edu, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <input type="text" value={edu.degree} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], degree: e.target.value }; setEducation(u) }} className={inputClasses} placeholder="Degree" />
                    <input type="text" value={edu.institution} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], institution: e.target.value }; setEducation(u) }} className={inputClasses} placeholder="Institution" />
                    <input type="text" value={edu.period} onChange={(e) => { const u = [...education]; u[i] = { ...u[i], period: e.target.value }; setEducation(u) }} className={inputClasses} placeholder="Period" />
                  </div>
                  <button type="button" onClick={() => setEducation(education.filter((_, idx) => idx !== i))} className={removeBtnClasses}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setEducation([...education, { ...defaultEducation }])} className={addBtnClasses}>+ Add Education</button>
            </div>
          )}
        </div>

        {/* ──────────── PROJECTS ──────────── */}
        <div>
          <SectionHeader id="projects" title="Projects" count={projects.length} />
          {openSections.projects && (
            <div className="mt-3 space-y-4">
              {projects.map((proj, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">Project {i + 1}</span>
                    <button type="button" onClick={() => setProjects(projects.filter((_, idx) => idx !== i))} className={removeBtnClasses}>✕</button>
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={proj.name} onChange={(e) => { const u = [...projects]; u[i] = { ...u[i], name: e.target.value }; setProjects(u) }} className={inputClasses} placeholder="Project name" />
                    <input type="text" value={proj.github} onChange={(e) => { const u = [...projects]; u[i] = { ...u[i], github: e.target.value }; setProjects(u) }} className={inputClasses} placeholder="GitHub URL" />
                    <textarea value={proj.description} onChange={(e) => { const u = [...projects]; u[i] = { ...u[i], description: e.target.value }; setProjects(u) }} className={textareaClasses} placeholder="Project description..." rows={3} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setProjects([...projects, { ...defaultProject }])} className={addBtnClasses}>+ Add Project</button>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex items-center justify-end gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => router.push('/admin/resumes')}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !label.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Create Resume' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
