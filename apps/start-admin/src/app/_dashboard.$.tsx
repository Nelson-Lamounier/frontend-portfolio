import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '../components/layouts/DashboardPage'

export const Route = createFileRoute('/_dashboard/$')({
  component: DashboardNotFound,
})

function DashboardNotFound() {
  return (
    <DashboardPage
      title="Page not found"
      description="The page you are looking for does not exist or has been moved."
    >
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-10 text-center">
        <p className="text-5xl font-bold text-zinc-200 dark:text-zinc-700">404</p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Check the URL or use the sidebar to navigate to a valid page.
        </p>
      </div>
    </DashboardPage>
  )
}
