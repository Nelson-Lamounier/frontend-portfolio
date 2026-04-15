import { useCallback } from 'react'
import { CheckCircle, Archive, Loader2, RefreshCw, FileText, ShieldCheck } from 'lucide-react'
import { usePipelineStatus } from '../hooks/use-pipeline-status'
import { usePipelineAction } from '../hooks/use-pipeline-action'
import { useArticleVersions } from '@/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'

// =============================================================================
// Types
// =============================================================================

interface PipelineResultsPanelProps {
  readonly pipelineSlug: string
  readonly onActionComplete: () => void
}

// =============================================================================
// Component
// =============================================================================

/**
 * Shown on the "Article Processing" tab once the pipeline reaches a terminal
 * QA state (review or flagged). Surfaces:
 *   - Generated Title    — returned by the Writer agent
 *   - QA Evaluation      — score and recommendation from the QA agent
 *   - Action buttons     — Approve & Publish / Reject & Archive (review)
 *                          Revise & Re-submit / Archive (flagged)
 *
 * Self-contained: calls usePipelineStatus and useArticleVersions internally.
 * TanStack Query deduplicates network requests with the parent caller.
 */
export function PipelineResultsPanel({ pipelineSlug, onActionComplete }: PipelineResultsPanelProps) {
  const { addToast } = useToastStore()
  const pipelineStatus = usePipelineStatus(pipelineSlug)
  const actionMutation = usePipelineAction()

  const state = pipelineStatus.data?.pipelineState
  const terminalWithQA = state === 'review' || state === 'flagged'

  const { data: versionData } = useArticleVersions(terminalWithQA ? pipelineSlug : null)
  const latestVersion = versionData?.versions
    ? [...versionData.versions].sort((a, b) => b.version - a.version)[0]
    : null

  const handleApprove = useCallback(() => {
    actionMutation.mutate(
      { slug: pipelineSlug, action: 'approve' },
      {
        onSuccess: () => {
          addToast('success', `"${pipelineSlug}" queued for publishing.`)
          onActionComplete()
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }, [pipelineSlug, actionMutation, addToast, onActionComplete])

  const handleReject = useCallback(() => {
    actionMutation.mutate(
      { slug: pipelineSlug, action: 'reject' },
      {
        onSuccess: () => {
          addToast('info', `"${pipelineSlug}" archived.`)
          onActionComplete()
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }, [pipelineSlug, actionMutation, addToast, onActionComplete])

  // Nothing to show until the pipeline produces output
  if (!pipelineStatus.data?.title && !terminalWithQA) return null

  return (
    <div className="space-y-4">
      {/* ── Generated title ─────────────────────────────────────────────────── */}
      {pipelineStatus.data?.title && (
        <div className="rounded-xl bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Generated Title</span>
          </div>
          <p className="mt-1 text-sm font-medium text-zinc-200">{pipelineStatus.data.title}</p>
        </div>
      )}

      {/* ── QA evaluation ───────────────────────────────────────────────────── */}
      {terminalWithQA && latestVersion && (latestVersion.qaTotalScore !== undefined || latestVersion.qaRecommendation) && (
        <div className={`rounded-xl p-4 ${
          state === 'review'
            ? 'border border-emerald-500/20 bg-emerald-500/5'
            : 'border border-orange-500/20 bg-orange-500/5'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>QA evaluation — v{latestVersion.version}</span>
            </div>
            {latestVersion.qaTotalScore !== undefined && (
              <span className={`text-sm font-bold tabular-nums ${
                latestVersion.qaTotalScore >= 80 ? 'text-emerald-400' : 'text-orange-400'
              }`}>
                {latestVersion.qaTotalScore}
                <span className="text-xs font-normal text-zinc-500">/100</span>
              </span>
            )}
          </div>
          {latestVersion.qaRecommendation && (
            <p className="mt-1 text-xs capitalize text-zinc-400">
              Recommendation:{' '}
              <span className={
                latestVersion.qaRecommendation === 'approve' ? 'text-emerald-400' :
                latestVersion.qaRecommendation === 'revise'  ? 'text-amber-400'   : 'text-red-400'
              }>
                {latestVersion.qaRecommendation}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── Review actions ──────────────────────────────────────────────────── */}
      {state === 'review' && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="mb-3">
            <p className="text-sm font-semibold text-emerald-300">Ready for review</p>
            <p className="mt-1 text-xs text-zinc-500">
              QA agent approved this article. Approve to publish to the site, or reject to archive.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={actionMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] disabled:opacity-50"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve &amp; Publish
            </button>
            <button
              onClick={handleReject}
              disabled={actionMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-400 transition-all duration-200 hover:border-amber-500/30 hover:bg-zinc-800 hover:text-amber-400 active:scale-[0.98] disabled:opacity-50"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Reject &amp; Archive
            </button>
          </div>
        </div>
      )}

      {/* ── Flagged actions ─────────────────────────────────────────────────── */}
      {state === 'flagged' && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
          <div className="mb-3">
            <p className="text-sm font-semibold text-orange-300">Article flagged for revision</p>
            <p className="mt-1 text-xs text-zinc-500">
              QA score below threshold. Improve the draft and re-submit the same slug to generate
              a new version.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onActionComplete}
              disabled={actionMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition-all duration-200 hover:bg-orange-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Revise &amp; Re-submit
            </button>
            <button
              onClick={handleReject}
              disabled={actionMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-400 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
