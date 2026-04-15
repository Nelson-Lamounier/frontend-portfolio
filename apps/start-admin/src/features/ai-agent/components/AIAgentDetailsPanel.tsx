import { ProgressBar, type ProgressStep, type ProgressStepStatus } from '../../../components/ui/ProgressBar'
import type { PipelineState } from '../hooks/use-pipeline-status'
import type { AgentMode } from './AIAgentTypes'

// =============================================================================
// Types
// =============================================================================

interface AIAgentDetailsPanelProps {
  readonly mode: AgentMode
  readonly pipelineState?: PipelineState
}

// =============================================================================
// Pipeline flow — 6-step map of actual backend execution
// =============================================================================

/**
 * Maps the high-level pipeline state to a 6-step ProgressBar.
 *
 * Actual backend sequence:
 *   0. S3 Upload       — draft written to the S3 pipeline input bucket
 *   1. Pipeline Trigger — ObjectCreated event fires the trigger Lambda,
 *                         which starts the Step Functions state machine
 *   2. Research Agent  — Haiku 4.5 queries the knowledge base and web
 *   3. Writer Agent    — Sonnet 4.6 generates the MDX article
 *   4. QA Agent        — Sonnet 4.6 reviews accuracy and quality
 *   5. Human Review    — approve to publish, reject to archive
 *
 * State → current step index:
 *   pending    → 1  (trigger Lambda in flight)
 *   processing → 2  (Bedrock agents running; Research is first)
 *   flagged    → 4  (QA ran and scored below threshold)
 *   review     → 5  (agents complete, awaiting human approval)
 *   rejected   → 5  (terminal at review stage)
 *   failed     → 2  (pipeline errored during Bedrock execution)
 *   published  → all complete
 */
function stepsFromPipelineState(state: PipelineState | undefined): ProgressStep[] {
  const step = (idx: number): ProgressStepStatus => {
    if (state === undefined) return 'upcoming'
    if (state === 'published') return 'complete'

    const currentIdx: Partial<Record<PipelineState, number>> = {
      pending:    1,
      processing: 2,
      flagged:    4,
      review:     5,
      rejected:   5,
      failed:     2,
    }

    const current = currentIdx[state] ?? -1
    if (idx < current) return 'complete'
    if (idx === current) return 'current'
    return 'upcoming'
  }

  return [
    {
      name: 'S3 Upload',
      description: 'Draft written to the S3 pipeline input bucket',
      status: step(0),
    },
    {
      name: 'Pipeline Trigger',
      description: 'ObjectCreated event starts the Step Functions state machine',
      status: step(1),
    },
    {
      name: 'Research Agent',
      description: 'Haiku 4.5 — knowledge base queries & web research',
      status: step(2),
    },
    {
      name: 'Writer Agent',
      description: 'Sonnet 4.6 — MDX article generation from research output',
      status: step(3),
    },
    {
      name: 'QA Agent',
      description: 'Sonnet 4.6 — accuracy, quality & threshold review',
      status: step(4),
    },
    {
      name: 'Human Review',
      description: 'Approve to publish to the site, or reject to archive',
      status: step(5),
    },
  ]
}

// =============================================================================
// Component
// =============================================================================

export function AIAgentDetailsPanel({ mode, pipelineState }: AIAgentDetailsPanelProps) {
  if (mode === 'paste') {
    return (
      <div className="p-6">
        <h3 className="mb-2 text-sm font-medium text-zinc-300">Paste Mode</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Paste your markdown directly into the editor to automatically trigger the Bedrock
          multi-agent pipeline.
        </p>
      </div>
    )
  }

  const steps = stepsFromPipelineState(pipelineState)

  const heading =
    mode === 'pipeline' ? 'Pipeline Progress' : 'Upload Mode'

  const description =
    mode === 'pipeline'
      ? 'Live status from the Bedrock multi-agent pipeline. Polling every 10 s.'
      : 'Drop a .md file to the left and click "Publish". The file is uploaded to S3, which automatically triggers the Bedrock multi-agent pipeline.'

  return (
    <div className="p-2">
      <h3 className="mb-1 text-sm font-medium text-zinc-300">{heading}</h3>
      <p className="mb-6 text-xs leading-relaxed text-zinc-500">{description}</p>
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Pipeline Flow
      </h4>
      <ProgressBar steps={steps} />
    </div>
  )
}
