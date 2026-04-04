import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ApplicationsList } from '@/features/applications/components/ApplicationsList'
import { DashboardPage } from '@/components/layouts/DashboardPage'

const searchSchema = z.object({
  stage: z.string().optional(),
})

export const Route = createFileRoute('/_dashboard/applications/list')({
  component: ApplicationsListRoute,
  validateSearch: searchSchema,
})


function ApplicationsListRoute() {
  const { stage } = Route.useSearch()
  return (
    <DashboardPage
      title="Applications"
      description="List of all applications"
    >
      <ApplicationsList initialStage={stage} />
    </DashboardPage>
  )
}
