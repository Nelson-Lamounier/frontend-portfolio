import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/components/layouts/DashboardPage'
import { ArticleContainer } from '@/features/articles/components/ArticleContainer'

export const Route = createFileRoute('/_dashboard/test')({
  component: TestRoute,
})

function TestRoute() {
  return (
    <DashboardPage 
      title="Test Sandbox" 
      description="A designated UI testing area to validate and experiment with new components."
    >
      <ArticleContainer />
    </DashboardPage>
  )
}
