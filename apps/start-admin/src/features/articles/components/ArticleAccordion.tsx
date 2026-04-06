import { useState } from 'react'
import { SectionHeader } from '../../../components/ui/SectionHeader'
import { ArticleVersionsList } from './ArticleVersionsList'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { Button } from '../../../components/ui/Button'
import { useDeleteArticle } from '@/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'

interface ArticleAccordionProps {
  readonly article: ArticleWithSlug
  readonly isDraft: boolean
}

export function ArticleAccordion({ article, isDraft }: ArticleAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const deleteMutation = useDeleteArticle()
  const { addToast } = useToastStore()

  function handleDeleteAllVersions(e: React.MouseEvent) {
    e.stopPropagation() // Prevent accordion from expanding
    const confirmed = globalThis.window.confirm(
      `⚠️ Delete ALL versions of "${article.title}"?\n\nThis will permanently remove the article from DynamoDB.\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    deleteMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `All versions of "${article.title}" deleted.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  return (
    <div className={isExpanded ? 'relative z-10' : 'relative z-0'}>
      <SectionHeader
        title={article.title}
        description={
          <div className="flex flex-col gap-2">
            <span>{article.description || article.aiSummary || 'No description available.'}</span>
            <div className="flex items-center gap-2">
              {article.tags && article.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {article.category && (
                <span className="text-xs text-gray-500 border-l border-white/10 pl-2 ml-1">
                  {article.category}
                </span>
              )}
              {article.readingTimeMinutes && (
                <span className="text-xs text-gray-500 border-l border-white/10 pl-2 ml-1">
                  {article.readingTimeMinutes} min read
                </span>
              )}
            </div>
          </div>
        }
        onClick={() => setIsExpanded(!isExpanded)}
        expandable={true}
        isExpanded={isExpanded}
        action={
          <Button 
            variant="danger-lg" 
            onClick={handleDeleteAllVersions}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        }
      />
      {isExpanded && (
        <div className=" animate-in fade-in slide-in-from-top-2 duration-200">
          <ArticleVersionsList article={article} isDraft={isDraft} />
        </div>
      )}
    </div>
  )
}
