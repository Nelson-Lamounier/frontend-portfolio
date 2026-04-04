import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ApplicationsList } from '@/features/applications/components/ApplicationsList'

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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">

        </div>
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Applications
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          List of all applications
        </p>
      </div>
     <ApplicationsList initialStage={stage} />
    </div>
  )
}

// function ApplicationsListRoute() {
//   const { stage } = Route.useSearch()

//   return (
//     <div className="space-y-6 max-w-7xl mx-auto">
//       <ApplicationsList initialStage={stage} />
//     </div>
//   )
// }
