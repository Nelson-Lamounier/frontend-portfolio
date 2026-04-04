import { createFileRoute } from '@tanstack/react-router'
import { ArticlesPipeline } from '../features/articles/components/ArticlesPipeline'

export const Route = createFileRoute('/_dashboard/articles')({
  component: ArticlesPage,
})

function ArticlesPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">

        </div>
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Article Management
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Review, edit, publish, and delete Bedrock-generated article versions.
        </p>
      </div>
      <ArticlesPipeline />
    </div>
  )
}
