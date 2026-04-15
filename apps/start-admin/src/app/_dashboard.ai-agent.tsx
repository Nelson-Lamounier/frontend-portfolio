import { z } from 'zod'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AIAgentContainer } from '@/features/ai-agent/components/AIAgentContainer'
import { DashboardPage } from '@/components/layouts/DashboardPage'
import { FullWidthBar, type FullWidthBarStep } from '../components/ui/FullWidthBar'

const searchSchema = z.object({
  mode: z.enum(['test', 'pipeline']).catch('test').default('test'),
  slug: z.string().optional(),
})

export const Route = createFileRoute('/_dashboard/ai-agent')({
  validateSearch: searchSchema,
  component: AIAgentRoute,
})

function AIAgentRoute() {
  const { mode, slug } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const steps: FullWidthBarStep[] = [
    {
      name: 'Create Article',
      current: mode === 'test',
      onClick: () => navigate({ search: { mode: 'test' } }),
    },
    ...(mode === 'pipeline' && slug
      ? [
          {
            name: 'Article Processing',
            current: mode === 'pipeline',
            onClick: () => navigate({ search: { mode: 'pipeline', slug } }),
          } satisfies FullWidthBarStep,
        ]
      : []),
  ]

  return (
    <DashboardPage
      title="AI Agent"
      description="Bedrock-powered content generation and transformation"
      fullWidth={true}
      headerBottom={<FullWidthBar steps={steps} />}
    >
      <AIAgentContainer
        key={slug ?? mode}
        initialMode={mode === 'pipeline' ? 'pipeline' : 'test'}
        initialSlug={slug ?? null}
      />
    </DashboardPage>
  )
}
