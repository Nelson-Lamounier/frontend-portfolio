import { useState, useCallback } from 'react'
import {
  Loader2,
  AlertCircle,
  GraduationCap,
  ChevronRight,
  Send,
  Target,
  ArrowLeft
} from 'lucide-react'
import { useApplicationDetail } from '@/lib/hooks/use-application-detail'
import { useApplicationCoach } from '@/lib/hooks/use-application-coach'
import type { InterviewStage } from '@/lib/types/applications.types'
import { STAGE_LABELS } from './ApplicationTypes'

function SectionHeading({ title, subtitle }: { readonly title: string; readonly subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  )
}

export function ApplicationInterviewPrep({ slug, onBack }: { readonly slug: string; readonly onBack?: () => void }) {
  const { data: detail, isLoading, error } = useApplicationDetail(slug)
  const coach = useApplicationCoach()
  const [coachStage, setCoachStage] = useState<InterviewStage>('phone-screen')

  const handleStartPrep = useCallback(() => {
    if (!detail) return
    coach.mutate({
      applicationSlug: detail.slug,
      interviewStage: coachStage,
    })
  }, [coach, detail, coachStage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>Failed to load application details: {error?.message}</span>
      </div>
    )
  }

  const prep = detail.interviewPrep

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Applications
        </button>
      )}

      {!prep ? (
        <div className="mx-auto max-w-lg py-8">
          <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-zinc-900 to-zinc-900 p-8 text-center shadow-lg shadow-sky-500/5">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20">
              <GraduationCap className="h-7 w-7 text-sky-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Prepare for Interview
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Select the interview stage you&apos;ve been invited to.
              The Coach agent will generate stage-specific preparation materials.
            </p>

            <div className="mt-6">
              <label htmlFor="coach-stage" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Interview Stage
              </label>
              <select
                id="coach-stage"
                value={coachStage}
                onChange={(e) => setCoachStage(e.target.value as InterviewStage)}
                className="mx-auto w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm
                           text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="phone-screen">Phone Screen</option>
                <option value="technical">Technical Round</option>
                <option value="system-design">System Design</option>
                <option value="behavioural">Behavioural</option>
                <option value="bar-raiser">Bar Raiser</option>
                <option value="final">Final Round</option>
              </select>
            </div>

            {coach.error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {coach.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartPrep}
              disabled={coach.isPending}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm
                         font-medium text-white transition-all hover:bg-sky-500
                         hover:shadow-lg hover:shadow-sky-500/20
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {coach.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {coach.isPending ? 'Starting Coach…' : 'Start Preparation'}
            </button>

            {coach.isPending && (
              <p className="mt-3 text-xs text-zinc-600">
                The Coach agent is loading your application context…
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stage header */}
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-sky-400" />
              <div>
                <span className="text-sm font-semibold text-sky-300">
                  {prep.stageDescription}
                </span>
                <p className="text-xs text-sky-400/70">
                  Stage: {STAGE_LABELS[prep.stage]}
                </p>
              </div>
            </div>
          </div>

          {/* Technical questions */}
          {prep.technicalQuestions.length > 0 && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
              <SectionHeading
                title="Technical Questions"
                subtitle={`${prep.technicalQuestions.length} questions`}
              />
              <div className="space-y-3">
                {prep.technicalQuestions.map((q, idx) => (
                  <div
                    key={`tech-${String(idx)}`}
                    className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-4"
                  >
                    <p className="text-sm font-medium text-zinc-200">{q.question}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-xs text-zinc-400">
                        {q.difficulty}
                      </span>
                      {q.sourceProject && (
                        <span className="text-xs text-zinc-500">
                          <ChevronRight className="inline h-3 w-3" />
                          {q.sourceProject}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Behavioural questions */}
          {prep.behaviouralQuestions.length > 0 && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
              <SectionHeading
                title="Behavioural Questions"
                subtitle={`${prep.behaviouralQuestions.length} questions`}
              />
              <div className="space-y-3">
                {prep.behaviouralQuestions.map((q, idx) => (
                  <div
                    key={`behav-${String(idx)}`}
                    className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-4"
                  >
                    <p className="text-sm font-medium text-zinc-200">{q.question}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-xs text-zinc-400">
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{q.answerFramework}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficult questions */}
          {prep.difficultQuestions.length > 0 && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
              <SectionHeading title="Difficult Questions" subtitle="Bridge strategies included" />
              <div className="space-y-3">
                {prep.difficultQuestions.map((q, idx) => (
                  <div
                    key={`diff-${String(idx)}`}
                    className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4"
                  >
                    <p className="text-sm font-medium text-orange-200">{q.question}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      <span className="font-medium text-orange-300">Bridge:</span>{' '}
                      {q.bridgeStrategy}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{q.answerFramework}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical prep checklist */}
          {prep.technicalPrepChecklist.length > 0 && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
              <SectionHeading title="Preparation Checklist" />
              <div className="space-y-2">
                {prep.technicalPrepChecklist.map((item) => (
                  <div
                    key={item.topic}
                    className="flex items-start gap-3 rounded-lg border border-zinc-700/30
                               bg-zinc-900/30 p-3"
                  >
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-zinc-600">
                      <span className="text-xs text-zinc-500">
                        {item.priority === 'high' ? '!' : '·'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-200">{item.topic}</span>
                      <p className="mt-0.5 text-xs text-zinc-500">{item.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions to ask */}
          {prep.questionsToAsk.length > 0 && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
              <SectionHeading title="Questions to Ask" />
              <div className="space-y-2">
                {prep.questionsToAsk.map((q) => (
                  <div key={q.question} className="flex items-start gap-3 py-2">
                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                    <div>
                      <p className="text-sm text-zinc-200">{q.question}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{q.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coaching Notes */}
          {prep.coachingNotes && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
              <SectionHeading title="Coaching Notes" />
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                {prep.coachingNotes}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

