import { createFileRoute } from '@tanstack/react-router'
import { AIAgentContainer } from '@/features/ai-agent/components/AIAgentContainer'

export const Route = createFileRoute('/_dashboard/ai-agent')({
  component: AIAgentRoute,
})

function AIAgentRoute() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AIAgentContainer />
    </div>
  )
}
