import { useState } from 'react'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import DropDownOptions from '../../../components/ui/DropDownOptions'
import { DashboardDrawer } from '../../../components/ui/DashboardDrawer'
import { ArticleEditorDrawerContent } from './ArticleEditorDrawerContent'
import {
  useDeleteArticle,
  usePublishArticle,
  useUnpublishArticle,
  useUpdateMetadata,
} from '@/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'

interface ArticleVersionsListProps {
  readonly article: ArticleWithSlug
  readonly isDraft: boolean
}

/**
 * Displays version details for a single article, including
 * status badge, version number, date, GitHub URL input, and
 * an inline DashboardDrawer for editing MDX content.
 *
 * @param props - Component props
 * @returns Article versions list JSX
 */
export function ArticleVersionsList({ article, isDraft }: ArticleVersionsListProps) {
  const [githubUrl, setGithubUrl] = useState(article.githubUrl ?? '')
  const [githubSaved, setGithubSaved] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const updateMetadata = useUpdateMetadata()
  const publishMutation = usePublishArticle()
  const unpublishMutation = useUnpublishArticle()
  const deleteMutation = useDeleteArticle()
  const { addToast } = useToastStore()

  const githubDirty = githubUrl !== (article.githubUrl ?? '')
  const isMutating = publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending

  /**
   * Saves the GitHub URL metadata for the article.
   */
  function handleGithubSave(): void {
    updateMetadata.mutate(
      {
        slug: article.slug,
        updates: { githubUrl: githubUrl.trim() || null },
      },
      {
        onSuccess: () => {
          setGithubSaved(true)
          addToast('success', 'GitHub URL saved.')
          globalThis.setTimeout(() => setGithubSaved(false), 2000)
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }

  /**
   * Publishes the article after user confirmation.
   */
  function handlePublish(): void {
    const confirmed = globalThis.window.confirm(
      `Are you sure you want to publish "${article.title}"?\n\nThis will make the article visible to all visitors.`,
    )
    if (!confirmed) return

    publishMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `"${article.title}" published successfully.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Unpublishes the article (moves to draft) after user confirmation.
   */
  function handleUnpublish(): void {
    const confirmed = globalThis.window.confirm(
      `Move "${article.title}" back to draft?\n\nThis will remove it from the public article listing.`,
    )
    if (!confirmed) return

    unpublishMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `"${article.title}" moved to drafts.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Deletes the article after user confirmation.
   */
  function handleDelete(): void {
    const confirmed = globalThis.window.confirm(
      `⚠️ Delete "${article.title}"?\n\nThis will permanently remove the article from DynamoDB. The S3 content will be preserved as an archive.\n\nThis action cannot be undone.`,
    )
    if (!confirmed) return

    deleteMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `"${article.title}" deleted.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  /**
   * Opens the article preview in a new tab on the public site.
   */
  function handlePreviewArticle() {
    const baseUrl = import.meta.env?.PROD
      ? 'https://nelsonlamounier.com'
      : 'http://localhost:3000'
    globalThis.window.open(`${baseUrl}/articles/${article.slug}`, '_blank', 'noopener,noreferrer')
  }

  /**
   * Opens the inline DashboardDrawer editor.
   */
  function handleEditArticle() {
    setIsEditorOpen(true)
  }

  return (
    <>
      <ul className="divide-y divide-white/5 border border-white/10 rounded-lg bg-zinc-900">
        <li className="px-4 py-5 hover:bg-white/[0.02] transition-colors sm:px-6 first:rounded-t-lg last:rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isDraft
                    ? 'bg-amber-900/30 text-amber-300'
                    : 'bg-teal-900/30 text-teal-300'
                }`}
              >
                {isDraft ? 'Draft' : 'Published'}
              </span>
              <span className="inline-flex items-center text-sm font-semibold text-white">
                v{article.version ?? 1}
              </span>
              <time dateTime={article.date} className="text-xs text-zinc-500">
                {new Date(article.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </div>
            
            <div className="flex items-center gap-2">
              <DropDownOptions
                disabled={isMutating}
                onPreviewArticle={handlePreviewArticle}
                onEditArticle={handleEditArticle}
                onPublish={isDraft ? handlePublish : undefined}
                onUnpublish={!isDraft ? handleUnpublish : undefined}
                onDelete={handleDelete}
              />
            </div>
          </div>

          {/* Details Row: github */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 flex-shrink-0 text-zinc-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.338c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
                />
              </svg>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-48 rounded bg-black/20 border border-white/10 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {githubDirty && (
                <button
                  type="button"
                  onClick={handleGithubSave}
                  disabled={updateMetadata.isPending}
                  className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {updateMetadata.isPending ? 'Saving...' : 'Save'}
                </button>
              )}
              {githubSaved && (
                <span className="text-xs font-medium text-teal-400">✓ Saved</span>
              )}
            </div>
          </div>
        </li>
      </ul>

      {/* ── Inline Editor Drawer ─────────────────────────────────────────────── */}
      <DashboardDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="Edit Article"
        description={article.title}
        unstyledContent
      >
        <div className="flex h-full flex-col overflow-hidden">
          <ArticleEditorDrawerContent
            slug={article.slug}
            onClose={() => setIsEditorOpen(false)}
          />
        </div>
      </DashboardDrawer>
    </>
  )
}
