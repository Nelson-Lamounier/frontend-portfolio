import { createFileRoute } from '@tanstack/react-router'
import { ArticlesPipeline } from '../features/articles/components/ArticlesPipeline'
import { DashboardPage } from '../components/layouts/DashboardPage'

export const Route = createFileRoute('/_dashboard/articles')({
  component: ArticlesPage,
})

function ArticlesPage() {
  return (
    <DashboardPage
      title="Article Management"
      description="Review, edit, publish, and delete Bedrock-generated article versions."
    >
      <ArticlesPipeline />
    </DashboardPage>
  )
}
