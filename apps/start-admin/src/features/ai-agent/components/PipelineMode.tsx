import { Bot, Clock, Loader2, AlertCircle, FileText, CheckCircle, ExternalLink, Archive, XCircle } from 'lucide-react'
import { PipelineStepper } from './PipelineStepper'
import { PipelineActions } from './PipelineActions'
import { usePipelineStatus } from '@/lib/hooks/use-pipeline-status'

interface PipelineModeProps {
  readonly pipelineSlug: string
  readonly backToMenu: () => void
}

export function PipelineMode({ pipelineSlug, backToMenu }: PipelineModeProps) {
  const pipelineStatus = usePipelineStatus(pipelineSlug)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Pipeline header card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
            <Bot className="h-5 w-5 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-200">
              Pipeline Tracker
            </h2>
            <p className="truncate text-xs text-zinc-500">
              Slug: <code className="rounded bg-zinc-800 px-1.5 text-violet-400">{pipelineSlug}</code>
            </p>
          </div>
          {pipelineStatus.data?.pipelineState === 'processing' && (
            <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1">
              <Clock className="h-3 w-3 text-violet-400" />
              <span className="text-[11px] font-medium text-violet-400">
                Polling every 10s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline stepper */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        {pipelineStatus.isLoading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            <span className="text-sm text-zinc-400">
              Connecting to pipeline…
            </span>
          </div>
        ) : pipelineStatus.data ? (
          <PipelineStepper currentState={pipelineStatus.data.pipelineState} />
        ) : (
          <div className="flex items-center justify-center gap-3 py-8">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-zinc-400">
              Unable to fetch pipeline status
            </span>
          </div>
        )}
      </div>

      {/* Article info (shown when metadata becomes available) */}
      {pipelineStatus.data?.title && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Generated Title</span>
          </div>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            {pipelineStatus.data.title}
          </p>
        </div>
      )}

      {/* Approve/Reject actions (only shown in review state) */}
      {pipelineStatus.data?.pipelineState === 'review' && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <PipelineActions
            slug={pipelineSlug}
            pipelineState={pipelineStatus.data.pipelineState}
            onActionComplete={backToMenu}
          />
        </div>
      )}

      {/* Published state — success message with links */}
      {pipelineStatus.data?.pipelineState === 'published' && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Article published successfully!
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/articles/${pipelineSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Article
                </a>
                <a
                  href={`/admin/editor/${pipelineSlug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Edit in Editor
                </a>
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

      {/* Rejected state — info message */}
      {pipelineStatus.data?.pipelineState === 'rejected' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Archive className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Article rejected and archived
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                The generated article has been moved to the archive.
              </p>
              <button
                onClick={backToMenu}
                className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed state — error message */}
      {pipelineStatus.data?.pipelineState === 'failed' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">
                Pipeline encountered an error
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                The Bedrock pipeline failed to process this article. You can try uploading again.
              </p>
              <button
                onClick={backToMenu}
                className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polling timeout — pipeline may have failed silently */}
      {pipelineStatus.timedOut && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Pipeline polling timed out
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                The pipeline has been running for over 10 minutes without completing.
                It may have failed silently. Check the Step Functions console for details.
              </p>
              <button
                onClick={backToMenu}
                className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
