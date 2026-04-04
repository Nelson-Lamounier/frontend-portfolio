import { useState } from 'react'
import { Tabs } from '../../../components/ui/Tabs'
import type { TabItem } from '../../../types'
import { useAdminArticles } from '@/hooks/use-admin-articles'
import { ArticleAccordion } from './ArticleAccordion'

type ActiveTab = 'drafts' | 'published'

function ArticlesList({ tab, articles }: { readonly tab: ActiveTab; readonly articles: any[] }) {
  if (articles.length === 0) {
    return (
      <div className="mx-4 sm:mx-6 border-2 border-dashed border-white/10 rounded-lg p-12 text-center text-gray-500">
        {tab === 'drafts'
          ? 'No draft articles found. Push a new Markdown file to the drafts/ folder to trigger Bedrock transformation.'
          : 'No published articles yet.'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-4 sm:mx-6 border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
        {articles.map((article, index) => (
          <div key={article.slug} className={index > 0 ? 'border-t border-white/10' : ''}>
            <ArticleAccordion article={article} isDraft={tab === 'drafts'} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArticlesPipeline() {
  const [activeTab, setActiveTab] = useState<string>('drafts')
  const { data, isLoading, error, refetch } = useAdminArticles()

  const drafts = [...(data?.drafts ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const published = [...(data?.published ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const tabs: TabItem[] = [
    { name: 'drafts', current: activeTab === 'drafts', count: drafts.length },
    { name: 'published', current: activeTab === 'published', count: published.length },
  ]

  return (
    <div className="bg-gray-900 shadow-sm sm:rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6 text-white text-xl font-bold border-b border-white/10 pb-5">
        Articles History
      </div>
      <div className="px-4 sm:px-6">
        <Tabs tabs={tabs} onTabChange={setActiveTab} />
      </div>

      <div className="pb-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Loading articles from DynamoDB...</span>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="mx-4 sm:mx-6 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <ArticlesList 
            tab={activeTab as ActiveTab} 
            articles={activeTab === 'drafts' ? drafts : published} 
          />
        )}
      </div>
    </div>
  )
}
