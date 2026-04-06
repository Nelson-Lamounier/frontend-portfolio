import { useState, useEffect } from 'react'
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useApplicationsTrigger } from '@/lib/hooks/use-applications-trigger'
import type { InterviewStage } from '@/lib/types/applications.types'
import { INTERVIEW_STAGE_OPTIONS, MIN_JD_LENGTH } from './ApplicationTypes'
import { FormInput } from '../../../components/ui/Field'
import { Button } from '../../../components/ui/Button'
import { ProgressBars } from './ProgressBars'

function DraftSaver({ values }: { readonly values: Record<string, unknown> }) {
  useEffect(() => {
    localStorage.setItem('application-form-draft', JSON.stringify(values))
  }, [values])
  return null
}

export interface NewAnalysisPanelProps {
  preselectedResumeId: string
  onSuccess?: () => void
}

export function NewAnalysisPanel({ preselectedResumeId, onSuccess: _onSuccess }: NewAnalysisPanelProps) {
  const trigger = useApplicationsTrigger()
  const [submittedSlug, setSubmittedSlug] = useState<string | null>(null)

  const [initialDraft] = useState(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem('application-form-draft')
    if (!saved) return null
    try {
      return JSON.parse(saved)
    } catch {
      return null
    }
  })

  const form = useForm({
    defaultValues: {
      jobDescription: initialDraft?.jobDescription || '',
      targetCompany: initialDraft?.targetCompany || '',
      targetRole: initialDraft?.targetRole || '',
      interviewStage: (initialDraft?.interviewStage || 'applied') as InterviewStage,
      includeCoverLetter: initialDraft?.includeCoverLetter ?? true,
      testMode: false,
    },
    onSubmit: async ({ value }) => {
      if (value.testMode) {
        localStorage.removeItem('application-form-draft')
        form.reset()
        setSubmittedSlug(`mock-${Date.now()}`)
        return
      }

      trigger.mutate(
        {
          jobDescription: value.jobDescription,
          targetCompany: value.targetCompany.trim(),
          targetRole: value.targetRole.trim(),
          interviewStage: value.interviewStage,
          resumeId: preselectedResumeId,
          includeCoverLetter: value.includeCoverLetter,
        },
        {
          onSuccess: (data) => {
            localStorage.removeItem('application-form-draft')
            form.reset()
            setSubmittedSlug(data.applicationSlug)
            // We now skip calling onSuccess() to let the ProgressBars take over navigation
          },
        },
      )
    }
  })

  // Listen for external retry events
  useEffect(() => {
    const handleRetry = (e: Event) => {
      const customEvent = e as CustomEvent
      const { targetCompany, targetRole, interviewStage } = customEvent.detail
      if (targetCompany) form.setFieldValue('targetCompany', targetCompany)
      if (targetRole) form.setFieldValue('targetRole', targetRole)
      if (interviewStage) form.setFieldValue('interviewStage', interviewStage)
    }
    window.addEventListener('application-retry', handleRetry)
    return () => window.removeEventListener('application-retry', handleRetry)
  }, [form])

  if (submittedSlug) {
    return (
      <div className="mb-8 overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-sm">
        <ProgressBars slug={submittedSlug} />
      </div>
    )
  }

  return (
    <div className="mb-8 overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl">
          <Sparkles className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            Analyse New Job Description
          </h2>
          <p className="text-xs text-zinc-500">
            Paste a job description to analyse against your resume
          </p>
        </div>
      </div>

      <form
        className="px-6 pb-6 pt-5"
        onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Subscribe
            selector={(state) => state.values}
            children={(values) => <DraftSaver values={values} />}
          />

          {/* Company + Role row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field
              name="targetCompany"
              children={(field) => (
                <FormInput
                  field={field}
                  label="Target Company"
                  placeholder="e.g. Revolut"
                />
              )}
            />
            <form.Field
              name="targetRole"
              children={(field) => (
                <FormInput
                  field={field}
                  label="Target Role"
                  placeholder="e.g. Senior DevOps Engineer"
                />
              )}
            />
          </div>

          {/* Interview Stage + Resume Version row */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="interview-stage" className="mb-1.5 block text-sm/6 font-medium text-white">
                Interview Stage
              </label>
              <div className="mt-2">
                <form.Field
                  name="interviewStage"
                  children={(field) => (
                    <select
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value as InterviewStage)}
                      className="block p-2 w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm/6"
                    >
                      {INTERVIEW_STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-zinc-800 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="hidden">
              {/* the resume version selection has been moved to a previous pipeline step */}
            </div>
          </div>

          {/* Options row */}
          <div className="mt-5 flex flex-wrap items-center gap-6 px-1">
            <div className="flex items-center gap-2">
              <form.Field
                name="includeCoverLetter"
                children={(field) => (
                  <input
                    id={field.name}
                    name={field.name}
                    type="checkbox"
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 focus:ring-offset-zinc-900"
                  />
                )}
              />
              <label htmlFor="includeCoverLetter" className="text-sm font-medium text-zinc-300">
                Generate Cover Letter
              </label>
            </div>

            <div className="flex items-center gap-2">
              <form.Field
                name="testMode"
                children={(field) => (
                  <input
                    id={field.name}
                    name={field.name}
                    type="checkbox"
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 focus:ring-offset-zinc-900"
                  />
                )}
              />
              <label htmlFor="testMode" className="text-sm font-medium text-emerald-400">
                Run in Test Mode (Mock API)
              </label>
            </div>
          </div>

          {/* Job Description textarea */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="job-description" className="block text-sm/6 font-medium text-white">
                Job Description
              </label>
              <form.Subscribe
                selector={(state) => state.values.jobDescription}
                children={(jd) => (
                  <span
                    className={`text-xs ${
                      jd.length >= MIN_JD_LENGTH ? 'text-emerald-500' : 'text-zinc-500'
                    }`}
                  >
                    {jd.length} / {MIN_JD_LENGTH} min characters
                  </span>
                )}
              />
            </div>
            <form.Field
              name="jobDescription"
              children={(field) => (
                <div className="mt-2">
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Paste the full job description here. Include responsibilities, requirements, qualifications, and any other relevant details…"
                    rows={12}
                    className="block p-2 w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm/6"
                  />
                </div>
              )}
            />
          </div>

          {/* Error */}
          {trigger.error && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500 border border-red-500/20">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Analysis trigger failed
              </div>
              <p className="text-red-400 whitespace-pre-wrap break-words">{trigger.error.message}</p>
            </div>
          )}

          {/* Actions */}
          <form.Subscribe
            selector={(state) => [state.values.jobDescription, state.values.targetCompany, state.values.targetRole]}
            children={([jd, company, role]) => {
              const isValid = jd.length >= MIN_JD_LENGTH && company.trim().length > 0 && role.trim().length > 0
              
              return (
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    {isValid
                      ? '✓ Ready to analyse'
                      : 'Fill in company, role, and a job description (min 50 chars)'}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        form.reset()
                        localStorage.removeItem('application-form-draft')
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={!isValid || trigger.isPending}
                      className="gap-2"
                    >
                      {trigger.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {trigger.isPending ? 'Analysing…' : 'Start Analysis'}
                    </Button>
                  </div>
                </div>
              )
            }}
          />
        </form>
    </div>
  )
}
