import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ApplicationInterviewPrep } from '@/features/applications/components/ApplicationInterviewPrep'
import { useApplications } from '@/hooks/use-admin-applications'
import { ApplicationCard } from '@/features/applications/components/ApplicationCard'
import { Target, Loader2, AlertCircle } from 'lucide-react'
import { DashboardPage } from '@/components/layouts/DashboardPage'

export const Route = createFileRoute('/_dashboard/applications/interview-prep')({
  component: InterviewPrepHubRoute,
})

function InterviewPrepHubRoute() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  
  // Fetch all and filter locally for interview stages
  const { data: allApplications, isLoading, error } = useApplications('all')
  const applications = allApplications?.filter(
    (app) => app.status === 'interview-prep' || app.status === 'interviewing'
  )

  if (selectedSlug) {
    return (
      <DashboardPage title="Interview Preparation">
        <ApplicationInterviewPrep 
          slug={selectedSlug} 
          onBack={() => setSelectedSlug(null)} 
        />
      </DashboardPage>
    )
  }

  return (
    <DashboardPage
      title="Select Application for Prep"
      description="Choose an active application in the interview stage to generate preparation materials."
    >
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Failed to load applications: {error.message}</span>
        </div>
      )}

      {!isLoading && !error && (!applications || applications.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-zinc-800 rounded-xl bg-zinc-900/50">
          <Target className="mb-4 h-12 w-12 text-zinc-700" />
          <h3 className="text-lg font-medium text-zinc-400">
            No active interviews
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            You don't have any applications currently in the interview stage.
          </p>
        </div>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {applications.map((app) => (
            <ApplicationCard
              key={app.slug}
              app={app}
              onClick={() => setSelectedSlug(app.slug)}
            />
          ))}
        </div>
      )}
    </DashboardPage>
  )
}
