import { useState } from 'react'
import { useForm } from '@tanstack/react-form'


import { z } from 'zod'

// Icon imports for styling

import { Button, AddButton, RemoveButton, AddSubItemButton, RemoveSubItemButton } from '../../../components/ui/Button'
import { FormInput, FormTextarea, FieldInfo } from '../../../components/ui/Field'

// ============================================================================
// Types
// ============================================================================

export interface ResumeProfile {
  name: string
  title: string
  location: string
  email: string
  linkedin: string
  github: string
  website: string
}

export interface ResumeExperience {
  company: string
  title: string
  period: string
  highlights: string[]
}

export interface ResumeCertification {
  name: string
  issuer: string
  year: string
}

export interface ResumeSkillGroup {
  category: string
  skills: string[]
}

export interface ResumeEducation {
  degree: string
  institution: string
  period: string
}

export interface ResumeProject {
  name: string
  description: string
  github: string
}

export interface ResumeAchievement {
  achievement: string
}

export interface ResumeData {
  profile: ResumeProfile
  summary: string
  keyAchievements: ResumeAchievement[]
  experience: ResumeExperience[]
  certifications: ResumeCertification[]
  skills: ResumeSkillGroup[]
  education: ResumeEducation[]
  projects: ResumeProject[]
}

interface ResumeFormProps {
  readonly mode: 'create' | 'edit'
  readonly resumeId?: string
  readonly initialLabel?: string
  readonly initialData?: ResumeData
  readonly onSubmit?: (label: string, data: ResumeData) => Promise<void>
  readonly onCancel?: () => void
}

// ============================================================================
// Default Values
// ============================================================================

const defaultProfile: ResumeProfile = { name: '', title: '', location: '', email: '', linkedin: '', github: '', website: '' }
const defaultExperience: ResumeExperience = { company: '', title: '', period: '', highlights: [''] }
const defaultSkillGroup: ResumeSkillGroup = { category: '', skills: [''] }
const defaultEducation: ResumeEducation = { degree: '', institution: '', period: '' }
const defaultProject: ResumeProject = { name: '', description: '', github: '' }
const defaultCertification: ResumeCertification = { name: '', issuer: '', year: '' }
const defaultAchievement: ResumeAchievement = { achievement: '' }

// ============================================================================
// Validation Schema
// ============================================================================

const resumeSchema = z.object({
  label: z.string().min(1, 'Resume label is required'),
  data: z.object({
    profile: z.object({
      name: z.string().min(1, 'Name is required'),
      title: z.string().min(1, 'Title is required'),
      location: z.string(),
      email: z.string().email('Invalid email address').or(z.literal('')),
      linkedin: z.string(),
      github: z.string(),
      website: z.string(),
    }),
    summary: z.string(),
    keyAchievements: z.array(z.object({
      achievement: z.string()
    })),
    experience: z.array(z.object({
      company: z.string(),
      title: z.string(),
      period: z.string(),
      highlights: z.array(z.string())
    })),
    certifications: z.array(z.object({
      name: z.string(),
      issuer: z.string(),
      year: z.string()
    })),
    skills: z.array(z.object({
      category: z.string(),
      skills: z.array(z.string())
    })),
    education: z.array(z.object({
      degree: z.string(),
      institution: z.string(),
      period: z.string()
    })),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string(),
      github: z.string()
    })),
  })
})

type FormValues = z.infer<typeof resumeSchema>


// ============================================================================
// Component
// ============================================================================

export function ResumeForm({
  mode,
  initialLabel = '',
  initialData,
  onSubmit,
  onCancel,
}: ResumeFormProps) {
  const [saving, setSaving] = useState(false)

  const form = useForm({
    defaultValues: {
      label: initialLabel,
      data: {
        profile: initialData?.profile ?? { ...defaultProfile },
        summary: initialData?.summary ?? '',
        keyAchievements: initialData?.keyAchievements ?? [{ ...defaultAchievement }],
        experience: initialData?.experience ?? [{ ...defaultExperience, highlights: [''] }],
        certifications: initialData?.certifications ?? [{ ...defaultCertification }],
        skills: initialData?.skills ?? [{ ...defaultSkillGroup, skills: [''] }],
        education: initialData?.education ?? [{ ...defaultEducation }],
        projects: initialData?.projects ?? [{ ...defaultProject }],
      }
    } as FormValues,
    validators: {
      onChange: resumeSchema
    },
    onSubmit: async ({ value }) => {
      if (saving) return
      setSaving(true)

      // Clean empty fields that were left blank in arrays
      const cleanedData: ResumeData = {
        ...value.data,
        keyAchievements: value.data.keyAchievements.filter(a => a.achievement.trim()),
        experience: value.data.experience.filter(e => e.company.trim()).map(e => ({
          ...e, highlights: e.highlights.filter(h => h.trim())
        })),
        certifications: value.data.certifications.filter(c => c.name.trim()),
        skills: value.data.skills.filter(s => s.category.trim()).map(s => ({
          ...s, skills: s.skills.filter(sk => sk.trim())
        })),
        education: value.data.education.filter(e => e.degree.trim()),
        projects: value.data.projects.filter(p => p.name.trim())
      }

      try {
        if (onSubmit) {
          await onSubmit(value.label, cleanedData)
        }
      } finally {
        setSaving(false)
      }
    }
  })

  const labelClasses = "block text-sm/6 font-medium text-white mb-1 mt-3"
  const inputClasses = "block w-full rounded-md border-0 bg-white/5 py-1.5 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm/6"

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }} 
      className="px-4 pb-12 sm:px-6"
    >
      <div className="space-y-12">
        
        {/* ==================================================================== */}
        {/* VERSION CONFIGURATION */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12 pt-4">
          <h2 className="text-base/7 font-semibold text-white">Version Configuration</h2>
          <p className="mt-1 text-sm/6 text-gray-400">
            Identify this version of your resume (e.g. 'Frontend Engineer', 'Tech Lead').
          </p>
          <div className="mt-6">
            <form.Field
              name="label"
              children={(field) => (
                <FormInput label="Resume Label" field={field} placeholder="e.g. Lead Developer Profile" />
              )}
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PROFILE DETAILS */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Profile Details</h2>
          <p className="mt-1 text-sm/6 text-gray-400">The header section of your resume document.</p>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <form.Field name="data.profile.name" children={(field) => <FormInput label="Full Name" field={field} />} />
            </div>
            <div className="sm:col-span-3">
              <form.Field name="data.profile.title" children={(field) => <FormInput label="Professional Title" field={field} />} />
            </div>
            <div className="sm:col-span-3">
              <form.Field name="data.profile.email" children={(field) => <FormInput label="Email Address" type="email" field={field} />} />
            </div>
            <div className="sm:col-span-3">
              <form.Field name="data.profile.location" children={(field) => <FormInput label="Location" placeholder="e.g. London, UK" field={field} />} />
            </div>
            <div className="sm:col-span-2">
              <form.Field name="data.profile.linkedin" children={(field) => <FormInput label="LinkedIn" field={field} />} />
            </div>
            <div className="sm:col-span-2">
              <form.Field name="data.profile.github" children={(field) => <FormInput label="GitHub" field={field} />} />
            </div>
            <div className="sm:col-span-2">
              <form.Field name="data.profile.website" children={(field) => <FormInput label="Website" placeholder="e.g. example.com" field={field} />} />
            </div>
            <div className="col-span-full">
              <form.Field name="data.summary" children={(field) => <FormTextarea label="Professional Summary" rows={4} field={field} className="resize-y min-h-[100px]" />} />
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* KEY ACHIEVEMENTS */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Key Achievements</h2>
          <div className="mt-4 space-y-4">
            <form.Field
              name="data.keyAchievements"
              mode="array"
              children={(field) => (
                <>
                  {field.state.value.map((_, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-1">
                        <form.Field
                          name={`data.keyAchievements[${index}].achievement`}
                          children={(subField) => (
                            <div>
                               <textarea
                                id={subField.name}
                                name={subField.name}
                                value={subField.state.value}
                                onBlur={subField.handleBlur}
                                onChange={(e) => subField.handleChange(e.target.value)}
                                className={inputClasses}
                                rows={2}
                                placeholder="E.g. Scaled system to handle 10k RPS..."
                              />
                              <FieldInfo field={subField} />
                            </div>
                          )}
                        />
                      </div>
                      <RemoveButton onClick={() => field.removeValue(index)} />
                    </div>
                  ))}
                  <AddButton onClick={() => field.pushValue({ ...defaultAchievement })}>Add Achievement</AddButton>
                </>
              )}
            />
          </div>
        </div>
        
        {/* ==================================================================== */}
        {/* EXPERIENCE */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Work Experience</h2>
          <div className="mt-6 space-y-8">
            <form.Field
              name="data.experience"
              mode="array"
              children={(field) => (
                <>
                  {field.state.value.map((_, index) => (
                    <div key={index} className="rounded-lg bg-white/5 p-6 ring-1 ring-white/10 relative">
                      <div className="absolute right-4 top-4">
                        <RemoveButton onClick={() => field.removeValue(index)} />
                      </div>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 pr-8">
                        <div className="sm:col-span-2">
                          <form.Field name={`data.experience[${index}].company`} children={(f) => <FormInput label="Company" field={f} />} />
                        </div>
                        <div className="sm:col-span-2">
                          <form.Field name={`data.experience[${index}].title`} children={(f) => <FormInput label="Title" field={f} />} />
                        </div>
                        <div className="sm:col-span-2">
                          <form.Field name={`data.experience[${index}].period`} children={(f) => <FormInput label="Period" placeholder="e.g. 2022 - Present" field={f} />} />
                        </div>
                        
                        <div className="col-span-full">
                          <label className={labelClasses}>Highlights</label>
                          <form.Field
                            name={`data.experience[${index}].highlights`}
                            mode="array"
                            children={(highlightsField) => (
                              <div className="space-y-3">
                                {highlightsField.state.value.map((_, hIndex) => (
                                  <div key={hIndex} className="flex items-start gap-4">
                                    <form.Field
                                      name={`data.experience[${index}].highlights[${hIndex}]`}
                                      children={(hField) => (
                                        <div className="flex-1">
                                          <textarea 
                                            value={hField.state.value} 
                                            onChange={e => hField.handleChange(e.target.value)} 
                                            onBlur={hField.handleBlur}
                                            rows={2} 
                                            className={inputClasses} 
                                          />
                                        </div>
                                      )}
                                    />
                                    <RemoveSubItemButton onClick={() => highlightsField.removeValue(hIndex)} />
                                  </div>
                                ))}
                                <AddSubItemButton onClick={() => highlightsField.pushValue('')}>Add Highlight</AddSubItemButton>
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <AddButton onClick={() => field.pushValue({ ...defaultExperience, highlights: [''] })}>Add Experience</AddButton>
                </>
              )}
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SKILLS */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Skills</h2>
          <div className="mt-6 space-y-8">
            <form.Field
              name="data.skills"
              mode="array"
              children={(field) => (
                <>
                  {field.state.value.map((_, index) => (
                    <div key={index} className="rounded-lg bg-white/5 p-6 ring-1 ring-white/10 relative">
                      <div className="absolute right-4 top-4">
                        <RemoveButton onClick={() => field.removeValue(index)} />
                      </div>
                      <div className="grid grid-cols-1 pr-8 gap-y-2">
                        <div>
                          <form.Field name={`data.skills[${index}].category`} children={(f) => <FormInput label="Skill Category" placeholder="e.g. Languages" field={f} />} />
                        </div>
                        <div>
                          <label className={labelClasses}>Specific Skills</label>
                          <form.Field
                            name={`data.skills[${index}].skills`}
                            mode="array"
                            children={(skillsField) => (
                              <div className="mt-2 space-y-3">
                                {skillsField.state.value.map((_, sIndex) => (
                                  <div key={sIndex} className="flex items-center gap-4">
                                    <form.Field
                                      name={`data.skills[${index}].skills[${sIndex}]`}
                                      children={(sField) => (
                                        <input 
                                          value={sField.state.value} 
                                          onChange={e => sField.handleChange(e.target.value)} 
                                          onBlur={sField.handleBlur}
                                          className={inputClasses} 
                                        />
                                      )}
                                    />
                                    <RemoveSubItemButton onClick={() => skillsField.removeValue(sIndex)} />
                                  </div>
                                ))}
                                <AddSubItemButton onClick={() => skillsField.pushValue('')}>Add Skill</AddSubItemButton>
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <AddButton onClick={() => field.pushValue({ ...defaultSkillGroup, skills: [''] })}>Add Skill Group</AddButton>
                </>
              )}
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* EDUCATION */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Education</h2>
          <div className="mt-4 space-y-4">
            <form.Field
              name="data.education"
              mode="array"
              children={(field) => (
                <>
                  {field.state.value.map((_, index) => (
                    <div key={index} className="flex items-start gap-4 rounded-lg bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                        <form.Field name={`data.education[${index}].degree`} children={(f) => <FormInput label="Degree" field={f} />} />
                        <form.Field name={`data.education[${index}].institution`} children={(f) => <FormInput label="Institution" field={f} />} />
                        <form.Field name={`data.education[${index}].period`} children={(f) => <FormInput label="Period" field={f} />} />
                      </div>
                      <div className="mt-8">
                        <RemoveButton onClick={() => field.removeValue(index)} />
                      </div>
                    </div>
                  ))}
                  <AddButton onClick={() => field.pushValue({ ...defaultEducation })}>Add Education</AddButton>
                </>
              )}
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PROJECTS */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Projects</h2>
          <div className="mt-6 space-y-6">
            <form.Field
              name="data.projects"
              mode="array"
              children={(field) => (
                <>
                  {field.state.value.map((_, index) => (
                    <div key={index} className="relative rounded-lg bg-white/5 p-6 ring-1 ring-white/10">
                      <div className="absolute right-4 top-4">
                        <RemoveButton onClick={() => field.removeValue(index)} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 pr-8 sm:grid-cols-2">
                        <form.Field name={`data.projects[${index}].name`} children={(f) => <FormInput label="Name" field={f} />} />
                        <form.Field name={`data.projects[${index}].github`} children={(f) => <FormInput label="URL (GitHub or Live)" field={f} />} />
                        <div className="col-span-full">
                          <form.Field name={`data.projects[${index}].description`} children={(f) => <FormTextarea label="Description" rows={2} field={f} />} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <AddButton onClick={() => field.pushValue({ ...defaultProject })}>Add Project</AddButton>
                </>
              )}
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CERTIFICATIONS */}
        {/* ==================================================================== */}
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base/7 font-semibold text-white">Certifications</h2>
          <div className="mt-4 space-y-4">
             <form.Field
              name="data.certifications"
              mode="array"
              children={(field) => (
                <>
                  {field.state.value.map((_, index) => (
                    <div key={index} className="flex items-start gap-4 rounded-lg bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                        <form.Field name={`data.certifications[${index}].name`} children={(f) => <FormInput label="Name" field={f} />} />
                        <form.Field name={`data.certifications[${index}].issuer`} children={(f) => <FormInput label="Issuer" field={f} />} />
                        <form.Field name={`data.certifications[${index}].year`} children={(f) => <FormInput label="Year" field={f} />} />
                      </div>
                      <div className="mt-8">
                        <RemoveButton onClick={() => field.removeValue(index)} />
                      </div>
                    </div>
                  ))}
                  <AddButton onClick={() => field.pushValue({ ...defaultCertification })}>Add Certification</AddButton>
                </>
              )}
            />
          </div>
        </div>

      </div>

      <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-white/10 pt-8">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              variant="secondary"
              disabled={!canSubmit || saving}
              className="px-6 py-2"
            >
              {isSubmitting || saving ? 'Saving...' : mode === 'create' ? 'Create Resume' : 'Save Changes'}
            </Button>
          )}
        />
      </div>
    </form>
  )
}
