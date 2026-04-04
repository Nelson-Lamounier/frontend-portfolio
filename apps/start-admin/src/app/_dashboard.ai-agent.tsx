import { createFileRoute } from '@tanstack/react-router'
import { AIAgentContainer } from '@/features/ai-agent/components/AIAgentContainer'
import { DashboardPage } from '@/components/layouts/DashboardPage'

export const Route = createFileRoute('/_dashboard/ai-agent')({
  component: AIAgentRoute,
})

function AIAgentRoute() {
  return (
    <DashboardPage title="AI Agent" description="Bedrock-powered content generation and transformation">
      <AIAgentContainer />
    </DashboardPage>
  )
}

