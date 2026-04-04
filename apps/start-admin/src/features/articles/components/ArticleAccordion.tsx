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
    <div>
      <SectionHeader
        title={article.title}
        description={article.description || article.aiSummary || 'No description available.'}
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
        <div className="p-4 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <ArticleVersionsList article={article} isDraft={isDraft} />
        </div>
      )}
    </div>
  )
}
