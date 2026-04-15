import { Bot, Clock, CheckCircle, ExternalLink, Archive, XCircle, Search, PenLine, ShieldCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PipelineSubmittedBanner } from './PipelineSubmittedBanner'
import { PipelineResultsPanel } from './PipelineResultsPanel'
import { usePipelineStatus } from '../hooks/use-pipeline-status'
import type { PipelineState } from '../hooks/use-pipeline-status'

interface PipelineModeProps {
  readonly pipelineSlug: string
  readonly backToMenu: () => void
}

// ── Pipeline stage definitions ────────────────────────────────────────────────

interface Stage {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const STAGES: Stage[] = [
  { id: 'research',  label: 'Research',   description: 'Haiku 4.5 — knowledge base + web research', icon: Search },
  { id: 'writer',    label: 'Writer',     description: 'Sonnet 4.6 — MDX article generation',       icon: PenLine },
  { id: 'qa',        label: 'QA Agent',   description: 'Sonnet 4.6 — accuracy & quality review',    icon: ShieldCheck },
]

type StageStatus = 'pending' | 'active' | 'done' | 'failed'

/**
 * Derive per-stage status from the high-level pipeline state.
 * The backend doesn't expose sub-stage progress, so we infer:
 *   pending     → all pending
 *   processing  → all active (unknown which stage is running)
 *   review/flagged/published/rejected → all done
 *   failed      → all failed
 */
function stageStatuses(state: PipelineState): [StageStatus, StageStatus, StageStatus] {
  switch (state) {
    case 'pending':    return ['pending',  'pending', 'pending']
    case 'processing': return ['active',   'active',  'active']
    case 'review':
    case 'flagged':
    case 'published':
    case 'rejected':   return ['done',     'done',    'done']
    case 'failed':     return ['failed',   'failed',  'failed']
    default:           return ['pending',  'pending', 'pending']
  }
}

// ── Stage step component ──────────────────────────────────────────────────────

function StageStep({ stage, status }: { stage: Stage; status: StageStatus }) {
  const Icon = stage.icon

  const iconCls = {
    pending:    'bg-zinc-800 text-zinc-600',
    active:     'bg-violet-500/20 text-violet-400 animate-pulse',
    done:       'bg-emerald-500/20 text-emerald-400',
    failed:     'bg-red-500/20 text-red-400',
  }[status]

  const labelCls = {
    pending:    'text-zinc-600',
    active:     'text-violet-300',
    done:       'text-zinc-200',
    failed:     'text-red-400',
  }[status]

  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className={`text-sm font-medium ${labelCls}`}>{stage.label}</p>
        <p className="text-[11px] text-zinc-600">{stage.description}</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipelineMode({ pipelineSlug, backToMenu }: PipelineModeProps) {
  const pipelineStatus = usePipelineStatus(pipelineSlug)
  const state = pipelineStatus.data?.pipelineState ?? 'pending'

  const stages = stageStatuses(state)

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
            <Bot className="h-5 w-5 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-200">Pipeline Tracker</h2>
            <p className="truncate text-xs text-zinc-500">
              Slug: <code className="rounded bg-zinc-800 px-1.5 text-violet-400">{pipelineSlug}</code>
            </p>
          </div>
          {state === 'processing' && (
            <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1">
              <Clock className="h-3 w-3 text-violet-400" />
              <span className="text-[11px] font-medium text-violet-400">Polling every 10s</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline steps ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Pipeline stages</p>
        <div className="space-y-4">
          {STAGES.map((stage, i) => (
            <div key={stage.id}>
              <StageStep stage={stage} status={stages[i]} />
              {i < STAGES.length - 1 && (
                <div className="ml-4 mt-1 h-4 w-px bg-zinc-800" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending banner ───────────────────────────────────────────────────── */}
      {state === 'pending' && (
        <PipelineSubmittedBanner slug={pipelineSlug} />
      )}

      {/* ── Results: Generated Title + QA evaluation + Actions ───────────────── */}
      <PipelineResultsPanel
        pipelineSlug={pipelineSlug}
        onActionComplete={backToMenu}
      />

      {/* ── Published ────────────────────────────────────────────────────────── */}
      {state === 'published' && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">Article published successfully!</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/articles/${pipelineSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Article
                </a>
                <Link
                  to="/articles"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Articles list
                </Link>
                <button
                  onClick={backToMenu}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Create Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejected ─────────────────────────────────────────────────────────── */}
      {state === 'rejected' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Archive className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Article rejected and archived</p>
              <p className="mt-1 text-xs text-zinc-500">Moved to archive. S3 content preserved.</p>
              <button onClick={backToMenu} className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Failed ───────────────────────────────────────────────────────────── */}
      {state === 'failed' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Pipeline encountered an error</p>
              <p className="mt-1 text-xs text-zinc-500">Bedrock pipeline failed. Check Step Functions console for details.</p>
              <button onClick={backToMenu} className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Polling timeout ───────────────────────────────────────────────────── */}
      {pipelineStatus.timedOut && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Pipeline polling timed out</p>
              <p className="mt-1 text-xs text-zinc-500">
                Running over 10 minutes without completing. May have failed silently. Check Step Functions console.
              </p>
              <button onClick={backToMenu} className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
