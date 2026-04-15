import { useState } from 'react'
import { Tabs } from '../../../components/ui/Tabs'
import type { TabItem } from '../../../types'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { useAdminArticles } from '@/hooks/use-admin-articles'
import { ArticleAccordion } from './ArticleAccordion'
import { Stats } from '../../../components/ui/Stats'
import { CommandPallete, type CommandPalleteItem } from '../../../components/ui/CommandPallete'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/20/solid'

type ActiveTab = 'all' | 'drafts' | 'processing' | 'in review' | 'flagged' | 'published' | 'failed'

const MODEL_OPTIONS: CommandPalleteItem[] = [
  { id: 'all', name: 'All Models', description: 'Show all articles' },
  { id: 'sonnet', name: 'Sonnet', description: 'Claude 3.5 Sonnet' },
  { id: 'haiku', name: 'Haiku', description: 'Claude 3 Haiku' },
]

function ArticlesList({ tab, articles }: { readonly tab: ActiveTab; readonly articles: ArticleWithSlug[] }) {
  if (articles.length === 0) {
    return (
      <div className="mx-4 sm:mx-6 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-lg p-12 text-center text-zinc-500">
        No {tab !== 'all' ? tab : ''} articles found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 mx-4 sm:mx-6 mt-6">
      {articles.map((article) => (
        <div
          key={article.slug}
          className="border border-zinc-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/2"
        >
          <ArticleAccordion article={article} />
        </div>
      ))}
    </div>
  )
}

export function ArticleContainer() {
  const [activeTab, setActiveTab] = useState<string>('all')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<CommandPalleteItem>(MODEL_OPTIONS[0])

  const { data, isLoading, error, refetch } = useAdminArticles()

  // Filter by selected model only
  const filterArticle = (article: ArticleWithSlug): boolean => {
    if (selectedModel.id === 'all') return true
    const m = selectedModel.id.toLowerCase()
    return (
      article.model?.toLowerCase().includes(m) ||
      article.tags?.some((t: string) => t.toLowerCase().includes(m)) ||
      !!article.aiSummary?.toLowerCase().includes(m)
    )
  }

  const byDate = (a: ArticleWithSlug, b: ArticleWithSlug) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()

  const all        = [...(data?.all        ?? [])].filter(filterArticle).sort(byDate)
  const drafts     = [...(data?.drafts     ?? [])].filter(filterArticle).sort(byDate)
  const processing = [...(data?.processing ?? [])].filter(filterArticle).sort(byDate)
  const review     = [...(data?.review     ?? [])].filter(filterArticle).sort(byDate)
  const flagged    = [...(data?.flagged    ?? [])].filter(filterArticle).sort(byDate)
  const published  = [...(data?.published  ?? [])].filter(filterArticle).sort(byDate)
  const failed     = [...(data?.failed     ?? [])].filter(filterArticle).sort(byDate)

  const tabs: TabItem[] = [
    { name: 'all',        current: activeTab === 'all',        count: all.length },
    { name: 'drafts',     current: activeTab === 'drafts',     count: drafts.length },
    { name: 'processing', current: activeTab === 'processing', count: processing.length },
    { name: 'in review',  current: activeTab === 'in review',  count: review.length },
    { name: 'flagged',    current: activeTab === 'flagged',    count: flagged.length },
    { name: 'published',  current: activeTab === 'published',  count: published.length },
    { name: 'failed',     current: activeTab === 'failed',     count: failed.length },
  ]

  const tabArticles: Record<string, ArticleWithSlug[]> = {
    all, drafts, processing, 'in review': review, flagged, published, failed,
  }

  const stats = [
    { name: 'Total articles', value: all.length,        change: 'all time' },
    { name: 'Draft',          value: drafts.length,     change: 'awaiting edit' },
    { name: 'Processing',     value: processing.length, change: 'pipeline running' },
    { name: 'In review',      value: review.length,     change: 'pending approval' },
    { name: 'Flagged',        value: flagged.length,    change: 'needs revision',  changeType: 'negative' },
    { name: 'Published',      value: published.length,  change: 'live on site',    changeType: 'positive' },
    { name: 'Failed',         value: failed.length,     change: 'needs retry',     changeType: 'negative' },
  ]

  return (
    <div className="bg-white dark:bg-zinc-900 shadow-sm sm:rounded-lg">
      <Stats stats={stats} />

      <CommandPallete
        open={paletteOpen}
        setOpen={setPaletteOpen}
        items={MODEL_OPTIONS}
        onSelect={(item) => setSelectedModel(item)}
        placeholder="Select a model..."
      />

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-5 sm:p-6 border-b border-zinc-200 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Articles History</h2>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <AdjustmentsHorizontalIcon className="size-5" />
            {selectedModel.id === 'all' ? 'Filter by Model' : `Model: ${selectedModel.name}`}
          </button>
        </div>

      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6">
        <Tabs tabs={tabs} onTabChange={setActiveTab} />
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="pb-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Loading articles from DynamoDB…</span>
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
            articles={tabArticles[activeTab] ?? all}
          />
        )}
      </div>
    </div>
  )
}
