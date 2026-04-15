import { CheckCircle2, Loader2 } from 'lucide-react'

interface PipelineSubmittedBannerProps {
  readonly slug: string
}

/**
 * Shown immediately after a draft is submitted while the pipeline state
 * is still `pending` — i.e. the S3 upload succeeded and the event notification
 * fired the trigger Lambda, but Bedrock hasn't started processing yet.
 *
 * Disappears automatically once the pipeline transitions to `processing`.
 */
export function PipelineSubmittedBanner({ slug }: PipelineSubmittedBannerProps) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-300">
            Draft submitted — pipeline triggered
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-violet-400">{slug}</code>{' '}
            was uploaded to S3. The article pipeline trigger Lambda has been fired and will
            start the Bedrock multi-agent workflow shortly.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1">
          <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
          <span className="text-[11px] font-medium text-zinc-400">Waiting…</span>
        </div>
      </div>
    </div>
  )
}
