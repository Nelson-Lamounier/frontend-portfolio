import { useCallback } from 'react'
import { CheckCircle, Archive, Loader2 } from 'lucide-react'
import type { PipelineState } from '../hooks/use-pipeline-status'
import { usePipelineAction } from '../hooks/use-pipeline-action'
import { useToastStore } from '@/lib/stores/toast-store'

interface PipelineActionsProps {
  readonly slug: string
  readonly pipelineState: PipelineState
  readonly onActionComplete: () => void
}

export function PipelineActions({ slug, pipelineState, onActionComplete }: PipelineActionsProps) {
  const { addToast } = useToastStore()
  const actionMutation = usePipelineAction()

  const handleApprove = useCallback(() => {
    actionMutation.mutate(
      { slug, action: 'approve' },
      {
        onSuccess: () => {
          addToast('success', `Article "${slug}" published successfully!`)
          onActionComplete()
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }, [slug, actionMutation, addToast, onActionComplete])

  const handleReject = useCallback(() => {
    actionMutation.mutate(
      { slug, action: 'reject' },
      {
        onSuccess: () => {
          addToast('success', `Article "${slug}" rejected and archived.`)
          onActionComplete()
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }, [slug, actionMutation, addToast, onActionComplete])

  if (pipelineState !== 'review') return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-400">
        Your article is ready. Review and decide:
      </p>
      <div className="flex gap-3">
        {/* Approve */}
        <button
          onClick={handleApprove}
          disabled={actionMutation.isPending}
          className="
            flex flex-1 items-center justify-center gap-2 rounded-xl
            bg-gradient-to-r from-emerald-500 to-teal-600
            px-4 py-3 text-sm font-semibold text-white
            shadow-lg shadow-emerald-500/20
            transition-all duration-300
            hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/30
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {actionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Approve & Publish
        </button>

        {/* Reject */}
        <button
          onClick={handleReject}
          disabled={actionMutation.isPending}
          className="
            flex flex-1 items-center justify-center gap-2 rounded-xl
            border border-zinc-700 bg-zinc-900
            px-4 py-3 text-sm font-semibold text-zinc-400
            transition-all duration-300
            hover:border-amber-500/30 hover:bg-zinc-800 hover:text-amber-400
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {actionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Reject & Archive
        </button>
      </div>
    </div>
  )
}
