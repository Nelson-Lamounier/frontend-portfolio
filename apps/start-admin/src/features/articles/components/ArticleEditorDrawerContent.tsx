import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useArticleContent,
  useSaveContent,
} from '@/hooks/use-admin-articles'
import { useToastStore } from '@/lib/stores/toast-store'
import { Tabs } from '#/components/ui/Tabs'
import { MdxPreview } from './MdxPreview'

interface ArticleEditorDrawerContentProps {
  /** The article slug to load content for */
  readonly slug: string
  /** Called when the user successfully saves and wants to close */
  readonly onClose: () => void
}

/**
 * Self-contained MDX editor that loads article content from S3
 * and provides save functionality. Designed to render inside a
 * `DashboardDrawer` overlay.
 *
 * @param props - Component props
 * @returns Editor content JSX
 */
export function ArticleEditorDrawerContent({
  slug,
  onClose,
}: ArticleEditorDrawerContentProps) {
  const { addToast } = useToastStore()

  // ── TanStack Query hooks ────────────────────────────────────────────────────
  const {
    data: articleData,
    isLoading,
    error: queryError,
    refetch,
  } = useArticleContent(slug)

  const saveMutation = useSaveContent()

  // ── Local editor state ──────────────────────────────────────────────────────
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [isInitialised, setIsInitialised] = useState(false)
  const [activeTab, setActiveTab] = useState('Write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Derived values
  const hasUnsavedChanges = content !== originalContent
  const error = queryError?.message ?? null

  // ── Sync fetched data into local state (only on initial load) ───────────────
  useEffect(() => {
    if (articleData && !isInitialised) {
      setContent(articleData.content)
      setOriginalContent(articleData.content)
      setIsInitialised(true)
    }
  }, [articleData, isInitialised])

  // ── Keyboard shortcut: Cmd/Ctrl + S ─────────────────────────────────────────
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

  // ── Ready state ─────────────────────────────────────────────────────────────
  const isReady = isInitialised && !isLoading

  return (
    <div className="flex h-full flex-col">
      {/* Loading */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-400">
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
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-800 bg-red-900/20 p-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
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
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Info bar */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              {content.length.toLocaleString()} characters ·{' '}
              {content.split('\n').length.toLocaleString()} lines
            </span>
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved
                </span>
              )}
              <span className="font-mono">⌘S to save</span>
            </div>
          </div>

          {/* Action bar and Tab Toggle */}
          <div className="flex-none">
            <Tabs
              tabs={[
                { name: 'Write', current: activeTab === 'Write' },
                { name: 'Preview', current: activeTab === 'Preview' },
              ]}
              onTabChange={setActiveTab}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'Write' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                className="h-full w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 p-4 font-mono text-sm leading-relaxed text-zinc-200 shadow-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Article MDX content…"
              />
            ) : (
              <div className="h-full rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-inner">
                <MdxPreview content={content} />
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
