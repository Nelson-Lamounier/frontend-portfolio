import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ResumesPipeline } from '@/features/resumes/components/ResumesPipeline'

export const Route = createFileRoute('/_dashboard/resumes')({
  component: ResumesRoute,
})

function ResumesRoute() {
  return (
    <div className="space-y-6 mx-auto relative">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl/8 font-semibold text-white sm:text-xl/8">Resumes</h1>
        <p className="mt-2 text-sm/6 text-zinc-400">
          Manage your role-tailored resume PDFs. The active version is served on the public site.
        </p>
      </div>

      {/* Feature Component */}
      <ResumesPipeline />
      
      <Outlet />
    </div>
  )
}
