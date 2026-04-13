import { useState } from 'react'
import { Tabs } from '../../../components/ui/Tabs'
import type { TabItem } from '../../../types'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { useAdminArticles } from '@/hooks/use-admin-articles'
import { ArticleAccordion } from './ArticleAccordion'
import { Stats } from '../../../components/ui/Stats'
import { CommandPallete, type CommandPalleteItem } from '../../../components/ui/CommandPallete'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/20/solid'

type ActiveTab = 'all' | 'drafts' | 'in review' | 'published' | 'failed'

function ArticlesList({ tab, articles }: { readonly tab: ActiveTab; readonly articles: any[] }) {
  if (articles.length === 0) {
    return (
      <div className="mx-4 sm:mx-6 border-2 border-dashed border-white/10 rounded-lg p-12 text-center text-zinc-500">
        No {tab !== 'all' ? tab : ''} articles found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 mx-4 sm:mx-6 mt-6">
      {articles.map((article) => (
        <div key={article.slug} className="border border-white/10 rounded-lg bg-white/[0.02]">
          <ArticleAccordion article={article} isDraft={article.status === 'draft'} />
        </div>
      ))}
    </div>
  )
}

const MODEL_OPTIONS: CommandPalleteItem[] = [
  { id: 'all', name: 'All Models', description: 'Show all articles' },
  { id: 'sonnet', name: 'Sonnet', description: 'Claude 3.5 Sonnet' },
  { id: 'haiku', name: 'Haiku', description: 'Claude 3 Haiku' },
]

export function ArticleContainer() {
  const [activeTab, setActiveTab] = useState<string>('all')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<CommandPalleteItem>(MODEL_OPTIONS[0])

  const { data, isLoading, error, refetch } = useAdminArticles()

  const filterByModel = (article: ArticleWithSlug) => {
    if (selectedModel.id === 'all') return true
    const t = selectedModel.id.toLowerCase()
    if (article.model?.toLowerCase().includes(t)) return true
    if (article.tags?.some((tag: string) => tag.toLowerCase().includes(t))) return true
    if (article.aiSummary?.toLowerCase().includes(t)) return true
    return false
  }

  const all = [...(data?.all ?? [])].filter(filterByModel).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const drafts = [...(data?.drafts ?? [])].filter(filterByModel).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const review = [...(data?.review ?? [])].filter(filterByModel).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const published = [...(data?.published ?? [])].filter(filterByModel).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const failed = [...(data?.failed ?? [])].filter(filterByModel).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const tabs: TabItem[] = [
    { name: 'all', current: activeTab === 'all', count: all.length },
    { name: 'drafts', current: activeTab === 'drafts', count: drafts.length },
    { name: 'in review', current: activeTab === 'in review', count: review.length },
    { name: 'published', current: activeTab === 'published', count: published.length },
    { name: 'failed', current: activeTab === 'failed', count: failed.length },
  ]

  const totalCount = all.length
  const draftCount = drafts.length
  const reviewCount = review.length
  const publishedCount = published.length
  const failedCount = failed.length

  const stats = [
    { name: 'Total articles', value: totalCount, change: 'all time' },
    { name: 'Draft', value: draftCount, change: 'awaiting edit' },
    { name: 'In review', value: reviewCount, change: 'pending approval' },
    { name: 'Published', value: publishedCount, change: 'live on site', changeType: 'positive' },
    { name: 'Failed', value: failedCount, change: 'needs retry', changeType: 'negative' },
  ]

  return (
    <div className="bg-zinc-900 shadow-sm sm:rounded-lg">
      <Stats stats={stats} />

      <CommandPallete
        open={paletteOpen}
        setOpen={setPaletteOpen}
        items={MODEL_OPTIONS}
        onSelect={(item) => setSelectedModel(item)}
        placeholder="Select a model..."
      />

      <div className="px-4 py-5 sm:p-6 text-white text-xl font-bold border-b border-white/10 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>Articles History</div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
          >
            <AdjustmentsHorizontalIcon className="size-5" />
            {selectedModel.id === 'all' ? 'Filter by Model' : `Model: ${selectedModel.name}`}
          </button>
        </div>
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
            articles={
              activeTab === 'all' ? all :
              activeTab === 'drafts' ? drafts :
              activeTab === 'in review' ? review :
              activeTab === 'failed' ? failed :
              published
            } 
          />
        )}
      </div>
    </div>
  )
}
