import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Cpu,
  FileSearch,
  FileText,
  PenLine,
  Database,
} from 'lucide-react'
import { useApplicationDetail, useExecutionStatus } from '@/hooks/use-admin-applications'
import { useApplicationRequeue } from '../hooks/use-application-requeue'

// =============================================================================
// Pipeline stage definitions
//
// Reflects the real AWS Step Function execution sequence for the Strategist
// pipeline. Timing windows are based on observed Bedrock invocation latency:
//   Research Agent     ~30–60 s  (job description extraction + fit analysis)
//   Strategist Agent   ~30–90 s  (cover letter + resume strategy generation)
//   Resume Builder     ~30–90 s  (full resume rewrite with tailored bullets)
//   Persist            ~5–10 s   (DynamoDB write + status update)
//
// Advancement is driven by elapsed wall-clock time, NOT by artificial
// setTimeout chains, so the UI reflects actual pipeline pacing.
// Windows are intentionally wider than median latency so the last stage
// does not show complete before the real pipeline finishes.
// =============================================================================

type StageStatus = 'complete' | 'current' | 'upcoming' | 'failed'

interface PipelineStage {
  id: string
  name: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
  startMs: number
  endMs: number
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'trigger',
    name: 'Pipeline initialised',
    description: 'Lambda invoked — Step Function execution started.',
    Icon: Cpu,
    startMs: 0,
    endMs: 3_000,
  },
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Claude analysing the job description against your resume profile.',
    Icon: FileSearch,
    startMs: 3_000,
    endMs: 75_000,
  },
  {
    id: 'strategist',
    name: 'Strategist Agent',
    description: 'Generating cover letter and positioning strategy.',
    Icon: FileText,
    startMs: 75_000,
    endMs: 165_000,
  },
  {
    id: 'resume-builder',
    name: 'Resume Builder',
    description: 'Rewriting resume bullets tailored to this role.',
    Icon: PenLine,
    startMs: 165_000,
    endMs: 240_000,
  },
  {
    id: 'persist',
    name: 'Saving results',
    description: 'Persisting analysis output to DynamoDB and updating status.',
    Icon: Database,
    startMs: 240_000,
    endMs: 255_000,
  },
]

// =============================================================================
// Helpers
// =============================================================================

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${String(sec).padStart(2, '0')}s` : `${sec}s`
}

// =============================================================================
// Component
// =============================================================================

export function ProgressBars({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const { data } = useApplicationDetail(slug)
  const requeue = useApplicationRequeue()

  const isFailed   = data?.status === 'failed'
  const isFinished = data != null && !['analysing', 'coaching'].includes(data.status)
  const isActive   = !isFinished && !isFailed

  // ── Real Step Functions execution state (polled every 5s while active) ───
  const execution = useExecutionStatus(slug, isActive)

  // ── Elapsed wall-clock (from SFN startDate when available, else mount) ───
  const startEpochRef = useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (execution?.startDate && !startEpochRef.current) {
      startEpochRef.current = new Date(execution.startDate).getTime()
    }
  }, [execution?.startDate])

  useEffect(() => {
    if (isFinished) return
    const origin = () => startEpochRef.current ?? Date.now()
    if (!startEpochRef.current) startEpochRef.current = Date.now()
    const iv = setInterval(() => setElapsedMs(Date.now() - origin()), 1_000)
    return () => clearInterval(iv)
  }, [isFinished])

  // ── Auto-redirect on success ──────────────────────────────────────────────
  useEffect(() => {
    if (!isFinished || isFailed) return
    const t = setTimeout(() => {
      void navigate({ to: '/applications/$slug', params: { slug } })
    }, 800)
    return () => clearTimeout(t)
  }, [isFinished, isFailed, navigate, slug])

  // ── Stage status resolution ───────────────────────────────────────────────
  // Real SFN stageId takes priority over wall-clock estimation.
  // When stageId is known: that stage is 'current', all before are 'complete',
  // all after are 'upcoming'. Wall-clock is only used when SFN data is absent.
  const activeStageId = execution?.stageId ?? null
  const activeStageIdx = activeStageId
    ? PIPELINE_STAGES.findIndex(s => s.id === activeStageId)
    : -1

  function getStageStatus(idx: number): StageStatus {
    if (isFailed) {
      const lastStarted = activeStageIdx >= 0
        ? activeStageIdx
        : PIPELINE_STAGES.reduce((acc, s, i) => elapsedMs >= s.startMs ? i : acc, 0)
      if (idx < lastStarted) return 'complete'
      if (idx === lastStarted) return 'failed'
      return 'upcoming'
    }
    if (isFinished) return 'complete'
    // Real SFN state available
    if (activeStageIdx >= 0) {
      if (idx < activeStageIdx) return 'complete'
      if (idx === activeStageIdx) return 'current'
      return 'upcoming'
    }
    // Fallback: wall-clock estimation
    const s = PIPELINE_STAGES[idx]
    if (elapsedMs >= s.endMs)   return 'complete'
    if (elapsedMs >= s.startMs) return 'current'
    return 'upcoming'
  }

  // ── Heading copy ──────────────────────────────────────────────────────────
  const heading = isFailed
    ? 'Analysis failed'
    : isFinished
    ? 'Analysis complete'
    : 'Analysing application'

  const subheading = isFailed
    ? 'The pipeline encountered an error. Requeue via the DLQ to retry.'
    : isFinished
    ? 'Redirecting to your results…'
    : 'Bedrock agents are running. This typically takes 4–6 minutes.'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-7 w-full max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{heading}</h3>
          <p className="mt-1 text-xs text-zinc-500">{subheading}</p>
        </div>

        {!isFinished && (
          <div className="flex-none flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-zinc-400 tabular-nums">
            <Clock className="w-3 h-3 shrink-0" />
            {formatElapsed(execution?.elapsedMs ?? elapsedMs)}
          </div>
        )}
      </div>

      {/* Steps */}
      <ol className="space-y-0" role="list" aria-label="Pipeline progress">
        {PIPELINE_STAGES.map((stage, idx) => {
          const status = getStageStatus(idx)
          const isLast  = idx === PIPELINE_STAGES.length - 1
          const { Icon } = stage

          return (
            <li key={stage.id} className="relative">
              {/* Connector */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={[
                    'absolute left-3.75 top-7.5 w-px',
                    'h-[calc(100%-4px)] transition-colors duration-700',
                    status === 'complete'            ? 'bg-emerald-500/35' :
                    status === 'current'             ? 'bg-violet-500/25' :
                    status === 'failed'              ? 'bg-rose-500/25' :
                    /* upcoming */                     'bg-zinc-800',
                  ].join(' ')}
                />
              )}

              <div className="flex items-start gap-4 pb-7">
                {/* Step icon */}
                <div className="relative flex-none mt-0.5" aria-hidden="true">
                  {status === 'complete' && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </span>
                  )}
                  {status === 'current' && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/35 animate-pulse">
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                    </span>
                  )}
                  {status === 'failed' && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-500/30">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    </span>
                  )}
                  {status === 'upcoming' && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/60 ring-1 ring-zinc-700/50">
                      <Icon className="w-3.5 h-3.5 text-zinc-600" />
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1 pt-1">
                  <p className={[
                    'text-sm font-medium leading-none',
                    status === 'complete' ? 'text-zinc-200' :
                    status === 'current'  ? 'text-violet-300' :
                    status === 'failed'   ? 'text-rose-300' :
                    /* upcoming */          'text-zinc-600',
                  ].join(' ')}>
                    {stage.name}
                  </p>
                  <p className={[
                    'mt-1 text-xs leading-relaxed',
                    status === 'upcoming' ? 'text-zinc-700' : 'text-zinc-500',
                  ].join(' ')}>
                    {stage.description}
                  </p>
                </div>

                {/* Running badge */}
                {status === 'current' && (
                  <div className="flex-none pt-0.5">
                    <span className="inline-flex items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400 ring-1 ring-inset ring-violet-500/20">
                      running
                    </span>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-600">
          Feel free to navigate away — you'll be notified when complete.
        </p>

        {isFailed ? (
          <button
            type="button"
            onClick={() => requeue.mutate({ slug })}
            disabled={requeue.isPending || requeue.isSuccess}
            className="inline-flex flex-none items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 ring-1 ring-inset ring-rose-500/20 hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {requeue.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {requeue.isSuccess ? 'Requeued' : 'Retry via DLQ'}
          </button>
        ) : (
          <Link
            to="/applications/$slug"
            params={{ slug }}
            className="flex-none text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            Go to overview →
          </Link>
        )}
      </div>

      {/* DLQ error feedback */}
      {requeue.isError && (
        <p className="text-xs text-rose-400">
          Requeue failed: {requeue.error instanceof Error ? requeue.error.message : 'Unknown error'}
        </p>
      )}
    </div>
  )
}
