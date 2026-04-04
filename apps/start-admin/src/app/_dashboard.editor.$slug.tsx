import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useArticleContent,
  useSaveContent,
} from '@/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'
import { HeaderLink } from '../components/ui/Button'

export const Route = createFileRoute('/_dashboard/editor/$slug')({
  component: AdminEditorPage,
})

/**
 * Admin editor page for editing raw MDX article content.
 * Data fetching and saving are driven by TanStack Query hooks.
 *
 * @returns Editor page JSX
 */
function AdminEditorPage() {
  const { slug } = Route.useParams()
  const { addToast } = useToastStore()

  // ── TanStack Query hooks ──────────────────────────────────────────────────
  const {
    data: articleData,
    isLoading,
    error: queryError,
    refetch,
  } = useArticleContent(slug)

  const saveMutation = useSaveContent()

  // ── Local editor state ────────────────────────────────────────────────────
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [isInitialised, setIsInitialised] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Derived values
  const title = articleData?.title ?? slug
  const description = articleData?.description ?? ''
  const status = articleData?.status ?? ''
  const hasUnsavedChanges = content !== originalContent
  const error = queryError?.message ?? null

  // ── Sync fetched data into local state (only on initial load) ─────────────
  useEffect(() => {
    if (articleData && !isInitialised) {
      setContent(articleData.content)
      setOriginalContent(articleData.content)
      setIsInitialised(true)
    }
  }, [articleData, isInitialised])

  // ── Handle "new" slug ─────────────────────────────────────────────────────
  useEffect(() => {
    if (slug === 'new' && !isInitialised) {
      setContent('')
      setOriginalContent('')
      setIsInitialised(true)
    }
  }, [slug, isInitialised])

  // ── Keyboard shortcut: Cmd/Ctrl + S ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges && !saveMutation.isPending) {
          handleSave()
        }
      }
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, saveMutation.isPending, content])

  /**
   * Saves updated content back to S3 via the save mutation.
   */
  const handleSave = useCallback(() => {
    saveMutation.mutate(
      { slug, content },
      {
        onSuccess: () => {
          setOriginalContent(content)
          addToast('success', 'Content saved to S3.')
        },
        onError: (err) => {
          addToast('error', err.message)
        },
      },
    )
  }, [slug, content, saveMutation, addToast])

  // ── Ready state (content loaded or new article) ───────────────────────────
  const isReady = isInitialised && !isLoading

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* ── Header Bar ── */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4 min-w-0">
            <HeaderLink to="/articles">
              ← Drafts
            </HeaderLink>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h1>
              {description && (
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Status + Actions */}
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status === 'published'
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              }`}
            >
              {status || '—'}
            </span>

            {/* Unsaved indicator */}
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved
              </span>
            )}

            {/* Preview */}
            <HeaderLink
              href={`${import.meta.env?.PROD ? 'https://nelsonlamounier.com' : 'http://localhost:3000'}/articles/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Preview ↗
            </HeaderLink>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              className="inline-flex items-center justify-center flex-shrink-0 whitespace-nowrap h-[34px] rounded-lg bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Loading article content…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="mx-auto max-w-2xl px-4 py-20">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        {isReady && !error && (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            {/* Info bar */}
            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {content.length.toLocaleString()} characters ·{' '}
                {content.split('\n').length.toLocaleString()} lines
              </span>
              <span className="font-mono">⌘S to save</span>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className="h-[calc(100vh-180px)] w-full resize-none rounded-xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-800 shadow-sm outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
              placeholder="Article MDX content…"
            />
          </div>
        )}
      </main>
    </div>
  )
}
