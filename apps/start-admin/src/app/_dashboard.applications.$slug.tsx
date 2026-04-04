import { createFileRoute } from '@tanstack/react-router'
import { ApplicationDetailContainer } from '@/features/applications/components/ApplicationDetailContainer'

export const Route = createFileRoute('/_dashboard/applications/$slug')({
  component: ApplicationDetailRoute,
})

function ApplicationDetailRoute() {
  const { slug } = Route.useParams()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ApplicationDetailContainer slug={slug} />
    </div>
  )
}
