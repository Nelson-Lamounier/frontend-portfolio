import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ResumesDisplayer } from '@/features/resumes/components/ResumesDisplayer'
import { DashboardPage } from '@/components/layouts/DashboardPage'

export const Route = createFileRoute('/_dashboard/resumes')({
  component: ResumesRoute,
})

function ResumesRoute() {
  return (
    <DashboardPage
      title="Resumes"
      description="Manage your role-tailored resume PDFs. The active version is served on the public site."
    >
      <div className="mx-auto relative">
        <ResumesDisplayer />
        <Outlet />
      </div>
    </DashboardPage>
  )
}
