import {
  CheckCircle,
  Loader2,
  Archive,
  AlertCircle,
  CloudUpload,
  Bot,
  Eye,
  Rocket,
} from 'lucide-react'
import type { PipelineState } from '@/lib/api/admin-api'
import { getStageIndex } from './AIAgentTypes'

// Export this here or in AIAgentTypes, let's keep the const array here and import types
const ACTUAL_PIPELINE_STAGES = [
  {
    key: 'pending' as const,
    label: 'Uploaded',
    description: 'Draft uploaded to S3',
    icon: <CloudUpload className="h-4 w-4" />,
  },
  {
    key: 'processing' as const,
    label: 'Processing',
    description: 'Bedrock multi-agent pipeline running',
    icon: <Bot className="h-4 w-4" />,
  },
  {
    key: 'review' as const,
    label: 'Ready for Review',
    description: 'Article generated, awaiting your decision',
    icon: <Eye className="h-4 w-4" />,
  },
  {
    key: 'published' as const,
    label: 'Published',
    description: 'Article approved and live on the portfolio',
    icon: <Rocket className="h-4 w-4" />,
  },
]

interface PipelineStepperProps {
  readonly currentState: PipelineState
}

export function PipelineStepper({ currentState }: PipelineStepperProps) {
  const currentIndex = getStageIndex(currentState)
  const isRejected = currentState === 'rejected'
  const isFailed = currentState === 'failed'

  return (
    <div className="space-y-1">
      {ACTUAL_PIPELINE_STAGES.map((stage, index) => {
        const isComplete = index < currentIndex
        const isActive = index === currentIndex
        const isFuture = index > currentIndex

        // Colour logic
        let dotColour = 'bg-zinc-700 text-zinc-500'
        let lineColour = 'bg-zinc-800'
        let labelColour = 'text-zinc-600'

        if (isComplete) {
          dotColour = 'bg-emerald-500/20 text-emerald-400'
          lineColour = 'bg-emerald-500/30'
          labelColour = 'text-emerald-400'
        } else if (isActive) {
          if (isRejected) {
            dotColour = 'bg-amber-500/20 text-amber-400'
            labelColour = 'text-amber-400'
          } else if (isFailed) {
            dotColour = 'bg-red-500/20 text-red-400'
            labelColour = 'text-red-400'
          } else if (stage.key === 'processing') {
            dotColour = 'bg-violet-500/20 text-violet-400'
            labelColour = 'text-violet-400'
          } else {
            dotColour = 'bg-teal-500/20 text-teal-400'
            labelColour = 'text-teal-400'
          }
        }

        return (
          <div key={stage.key}>
            <div className="flex items-center gap-3">
              {/* Stage dot/icon */}
              <div
                className={`
                  relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                  transition-all duration-500 ${dotColour}
                  ${isActive && !isRejected && !isFailed ? 'ring-2 ring-current/20' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isActive && currentState === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isActive && isRejected ? (
                  <Archive className="h-4 w-4" />
                ) : isActive && isFailed ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  stage.icon
                )}

                {/* Pulse ring for active processing stage */}
                {isActive && currentState === 'processing' && (
                  <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/10" />
                )}
              </div>

              {/* Stage text */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium transition-colors duration-300 ${labelColour}`}>
                  {isActive && isRejected
                    ? 'Rejected'
                    : isActive && isFailed
                      ? 'Failed'
                      : stage.label}
                </p>
                <p className={`text-xs ${isFuture ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {isActive && isRejected
                    ? 'Article moved to archive'
                    : isActive && isFailed
                      ? 'Pipeline encountered an error'
                      : stage.description}
                </p>
              </div>

              {/* Status indicator */}
              <div className="shrink-0">
                {isComplete && (
                  <span className="text-[10px] font-medium text-emerald-500">Done</span>
                )}
                {isActive && currentState === 'processing' && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1 w-1 animate-pulse rounded-full bg-violet-500/60"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connector line (not after last stage) */}
            {index < ACTUAL_PIPELINE_STAGES.length - 1 && (
               <div className="ml-[17px] flex h-6 items-center">
                 <div className={`h-full w-px transition-colors duration-500 ${lineColour}`} />
               </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
