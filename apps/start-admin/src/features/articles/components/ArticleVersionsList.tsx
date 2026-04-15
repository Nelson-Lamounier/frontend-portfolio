import { useState } from 'react'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { DashboardDrawer } from '../../../components/ui/DashboardDrawer'
import { ArticleEditorDrawerContent } from './ArticleEditorDrawerContent'
import {
  useDeleteArticle,
  usePublishArticle,
  useUnpublishArticle,
  useUpdateMetadata,
  useArticleVersions,
} from '@/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  ChevronDownIcon,
  TrashIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
} from '@heroicons/react/20/solid'

interface ArticleVersionsListProps {
  readonly article: ArticleWithSlug
}

// ─── Status badge colours ─────────────────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  draft:      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  published:  'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  flagged:    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  review:     'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  rejected:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  processing: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
}

const QA_CLASS: Record<string, string> = {
  approve: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  revise:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  reject:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

/**
 * Renders the current article's action row (status-aware actions) and
 * the full pipeline version history fetched from GET /articles/:slug/versions.
 *
 * Versioning is lazy — the query only fires when the accordion is expanded.
 */
export function ArticleVersionsList({ article }: ArticleVersionsListProps) {
  const [githubUrl, setGithubUrl] = useState(article.githubUrl ?? '')
  const [githubSaved, setGithubSaved] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const updateMetadata = useUpdateMetadata()
  const publishMutation = usePublishArticle()
  const unpublishMutation = useUnpublishArticle()
  const deleteMutation = useDeleteArticle()
  const { addToast } = useToastStore()

  // Lazy-fetch version history — fires only when this component mounts (accordion open)
  const { data: versionData, isLoading: versionsLoading } = useArticleVersions(article.slug)

  const status = article.status ?? 'draft'
  const githubDirty = githubUrl !== (article.githubUrl ?? '')
  const isMutating =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    deleteMutation.isPending ||
    updateMetadata.isPending

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleGithubSave(): void {
    updateMetadata.mutate(
      { slug: article.slug, updates: { githubUrl: githubUrl.trim() || null } },
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

  function handlePublish(): void {
    if (!globalThis.window.confirm(`Publish "${article.title}"?\n\nThis will make the article visible to all visitors.`)) return
    publishMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `"${article.title}" published.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  function handleUnpublish(): void {
    if (!globalThis.window.confirm(`Move "${article.title}" back to draft?\n\nThis will remove it from the public listing.`)) return
    unpublishMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `"${article.title}" moved to drafts.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  function handleDelete(): void {
    if (!globalThis.window.confirm(`Delete "${article.title}"?\n\nPermanently removes the article from DynamoDB. S3 content preserved as archive.\n\nCannot be undone.`)) return
    deleteMutation.mutate(article.slug, {
      onSuccess: () => addToast('success', `"${article.title}" deleted.`),
      onError: (err) => addToast('error', err.message),
    })
  }

  function handlePreview(): void {
    const baseUrl = import.meta.env?.PROD ? 'https://nelsonlamounier.com' : 'http://localhost:3000'
    globalThis.window.open(`${baseUrl}/articles/${article.slug}`, '_blank', 'noopener,noreferrer')
  }

  // Status-aware action flags
  const canPublish   = status === 'draft' || status === 'flagged' || status === 'review' || status === 'rejected'
  const canUnpublish = status === 'published'
  const canEdit      = status !== 'processing'
  const canDelete    = status !== 'processing'
  const isProcessing = status === 'processing'

  return (
    <>
      <div className="divide-y divide-zinc-100 dark:divide-white/5">

        {/* ── Current article actions row ─────────────────────────────────── */}
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Current</p>

            <div className="flex items-center gap-2">
              <Menu as="div" className="relative inline-block text-left">
                <MenuButton
                  disabled={isMutating || isProcessing}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-white ring-1 ring-zinc-200 dark:ring-white/5 hover:bg-zinc-200 dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing…' : 'Options'}
                  {!isProcessing && <ChevronDownIcon className="-mr-0.5 h-4 w-4 text-zinc-400" />}
                </MenuButton>

                <MenuItems
                  anchor="bottom end"
                  className="z-50 w-48 origin-top-right divide-y divide-zinc-100 dark:divide-white/10 rounded-md bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-zinc-200 dark:ring-white/10 outline-none transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in [--anchor-gap:4px]"
                >
                  {/* Primary actions */}
                  <div className="py-1">
                    <MenuItem>
                      <button type="button" onClick={handlePreview} className="group flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 data-focus:bg-zinc-50 dark:data-focus:bg-white/5 data-focus:outline-hidden">
                        <DocumentTextIcon className="mr-3 h-4 w-4 text-zinc-400 group-data-focus:text-zinc-600 dark:group-data-focus:text-white" />
                        Preview
                      </button>
                    </MenuItem>
                    {canEdit && (
                      <MenuItem>
                        <button type="button" onClick={() => setIsEditorOpen(true)} className="group flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 data-focus:bg-zinc-50 dark:data-focus:bg-white/5 data-focus:outline-hidden">
                          <PencilSquareIcon className="mr-3 h-4 w-4 text-zinc-400 group-data-focus:text-zinc-600 dark:group-data-focus:text-white" />
                          Edit
                        </button>
                      </MenuItem>
                    )}
                    {canPublish && (
                      <MenuItem>
                        <button type="button" onClick={handlePublish} className="group flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 data-focus:bg-zinc-50 dark:data-focus:bg-white/5 data-focus:outline-hidden">
                          <PaperAirplaneIcon className="mr-3 h-4 w-4 text-zinc-400 group-data-focus:text-zinc-600 dark:group-data-focus:text-white" />
                          Publish
                        </button>
                      </MenuItem>
                    )}
                    {canUnpublish && (
                      <MenuItem>
                        <button type="button" onClick={handleUnpublish} className="group flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 data-focus:bg-zinc-50 dark:data-focus:bg-white/5 data-focus:outline-hidden">
                          <PaperAirplaneIcon className="mr-3 h-4 w-4 rotate-180 text-zinc-400 group-data-focus:text-zinc-600 dark:group-data-focus:text-white" />
                          Unpublish
                        </button>
                      </MenuItem>
                    )}
                  </div>

                  {/* Destructive */}
                  {canDelete && (
                    <div className="py-1">
                      <MenuItem>
                        <button type="button" onClick={handleDelete} className="group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-500 data-focus:bg-red-50 dark:data-focus:bg-red-500/10 data-focus:outline-hidden">
                          <TrashIcon className="mr-3 h-4 w-4 text-red-400 group-data-focus:text-red-600 dark:group-data-focus:text-red-400" />
                          Delete
                        </button>
                      </MenuItem>
                    </div>
                  )}
                </MenuItems>
              </Menu>
            </div>
          </div>

          {/* GitHub URL */}
          <div className="mt-3 flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.338c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            <input
              type="url"
              placeholder="https://github.com/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-56 rounded bg-zinc-100 dark:bg-black/20 border border-zinc-300 dark:border-white/10 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {githubDirty && (
              <button type="button" onClick={handleGithubSave} disabled={updateMetadata.isPending} className="rounded bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50">
                {updateMetadata.isPending ? 'Saving…' : 'Save'}
              </button>
            )}
            {githubSaved && <span className="text-xs font-medium text-teal-400">✓ Saved</span>}
          </div>
        </div>

        {/* ── Pipeline version history ─────────────────────────────────────── */}
        <div className="px-4 py-4 sm:px-6">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Pipeline history
            {versionData && (
              <span className="ml-2 rounded-full bg-zinc-100 dark:bg-white/10 px-2 py-0.5 text-zinc-500 dark:text-zinc-400">
                {versionData.totalVersions}
              </span>
            )}
          </p>

          {versionsLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading versions…
            </div>
          )}

          {!versionsLoading && (!versionData?.versions || versionData.versions.length === 0) && (
            <p className="text-xs text-zinc-400 italic">No pipeline versions found.</p>
          )}

          {!versionsLoading && versionData?.versions && versionData.versions.length > 0 && (
            <div className="space-y-2">
              {[...versionData.versions].sort((a, b) => b.version - a.version).map((v) => (
                <div
                  key={v.sk}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/2 px-3 py-2.5"
                >
                  {/* Version badge */}
                  <span className="shrink-0 rounded-md bg-zinc-200 dark:bg-white/10 px-2 py-0.5 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    v{v.version}
                  </span>

                  {/* Pipeline status at this version */}
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[v.status] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                    {v.status}
                  </span>

                  {/* QA recommendation badge */}
                  {v.qaRecommendation && (
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${QA_CLASS[v.qaRecommendation] ?? ''}`}>
                      QA: {v.qaRecommendation}
                      {v.qaTotalScore !== undefined && ` (${v.qaTotalScore}/100)`}
                    </span>
                  )}

                  {/* Model used */}
                  {v.model && (
                    <span className="text-xs text-zinc-400 font-mono">{v.model}</span>
                  )}

                  {/* Date — pushed to the right */}
                  <time
                    dateTime={v.createdAt}
                    className="ml-auto shrink-0 text-xs text-zinc-400"
                  >
                    {new Date(v.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
