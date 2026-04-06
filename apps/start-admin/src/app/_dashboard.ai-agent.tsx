import { z } from 'zod'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AIAgentContainer } from '@/features/ai-agent/components/AIAgentContainer'
import { DashboardPage } from '@/components/layouts/DashboardPage'
import { FullWidthBar, type FullWidthBarStep } from '../components/ui/FullWidthBar'

const searchSchema = z.object({
  mode: z.enum(['test']).catch('test').default('test'),
})

export const Route = createFileRoute('/_dashboard/ai-agent')({
  validateSearch: searchSchema,
  component: AIAgentRoute,
})

function AIAgentRoute() {
  const { mode } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  
  // Create dynamic steps based on the current URL router state
  const steps: FullWidthBarStep[] = [
    {
      name: 'Create Article',
      current: mode === 'test',
      onClick: () => navigate({ search: { mode: 'test' } }),
    },
  ]

  return (
    <DashboardPage 
      title="AI Agent" 
      description="Bedrock-powered content generation and transformation"
      fullWidth={true}
      headerBottom={<FullWidthBar steps={steps} />}
    >
      <AIAgentContainer key={mode} initialMode={mode as any} />
    </DashboardPage>
  )
}

