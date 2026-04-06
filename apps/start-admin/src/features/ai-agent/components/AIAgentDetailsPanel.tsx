import { ProgressBar, type ProgressStep } from '../../../components/ui/ProgressBar'

interface AIAgentDetailsPanelProps {
  readonly mode: 'upload' | 'paste' | 'test'
}

export function AIAgentDetailsPanel({ mode }: AIAgentDetailsPanelProps) {
  const pipelineSteps: ProgressStep[] = [
    {
      name: 'S3 Upload',
      description: 'Securely transfer draft to the cloud',
      status: 'upcoming',
    },
    {
      name: 'Trigger Lambda',
      description: 'Event bridge invokes parser',
      status: 'upcoming',
    },
    {
      name: 'Bedrock Agents',
      description: 'Multi-agent refinement pipeline',
      status: 'upcoming',
    },
    {
      name: 'Review',
      description: 'Final manual validation',
      status: 'upcoming',
    },
  ]

  if (mode === 'paste') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h3 className="mb-2 text-sm font-medium text-zinc-300">
          Paste Mode
        </h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Paste your markdown directly into the editor to automatically trigger the Bedrock multi-agent pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl  p-6">
      <h3 className="mb-2 text-sm font-medium text-zinc-300">
        Upload Mode
      </h3>
      <p className="text-xs leading-relaxed text-zinc-500">
        Drop a .md file to the left and click "Upload & Trigger Pipeline".
        The file is uploaded to S3, which automatically triggers the Bedrock
        multi-agent pipeline. Track real-time progress on the next screen.
      </p>

      <div className="mt-6  p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Pipeline Flow
        </h4>
        <ProgressBar steps={pipelineSteps} />
      </div>
    </div>
  )
}
