/**
 * Admin Article Editor Page
 *
 * Full-page MDX editor for Bedrock-generated articles.
 * Fetches raw MDX from S3, displays in a monospace textarea,
 * and saves changes back to S3 without regenerating.
 *
 * Route: /admin/editor/[slug]
 * Access: NODE_ENV === 'development' only
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// =============================================================================
// TYPES
// =============================================================================

/** Shape of the GET /api/admin/articles/content response */
interface ContentApiResponse {
  slug: string
  contentRef: string
  content: string
  title: string
  description: string
  status: string
}

/** Shape of the PUT /api/admin/articles/content response */
interface SaveApiResponse {
  saved: boolean
  slug: string
  bytes: number
}

type PageState = 'loading' | 'ready' | 'error' | 'saving' | 'blocked'
type ToastType = 'success' | 'error'

interface Toast {
  message: string
  type: ToastType
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Admin editor page for editing raw MDX article content.
 *
 * @returns Editor page JSX
 */
export default function AdminEditorPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params.slug

  const [state, setState] = useState<PageState>('loading')
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasUnsavedChanges = content !== originalContent

  // ── Dev-only guard + fetch on mount ──
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/')
      setState('blocked')
      return
    }

    fetchContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // ── Auto-dismiss toasts ──
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // ── Keyboard shortcut: Cmd/Ctrl + S ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges && state === 'ready') {
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, state, content])

  /**
   * Fetches article content from the admin API.
   */
  const fetchContent = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const response = await fetch(
        `/api/admin/articles/content?slug=${encodeURIComponent(slug)}`,
      )

      if (response.status === 403) {
        setState('blocked')
        router.replace('/')
        return
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      const data = (await response.json()) as ContentApiResponse
      setContent(data.content)
      setOriginalContent(data.content)
      setTitle(data.title)
      setDescription(data.description)
      setStatus(data.status)
      setState('ready')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load content'
      setError(message)
      setState('error')
    }
  }, [slug, router])

  /**
   * Saves updated content back to S3 via the admin API.
   */
  const handleSave = useCallback(async () => {
    setState('saving')

    try {
      const response = await fetch('/api/admin/articles/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || `Failed with status ${response.status}`)
      }

      const data = (await response.json()) as SaveApiResponse
      setOriginalContent(content)
      setState('ready')
      setToast({
        message: `Saved ${data.bytes.toLocaleString()} bytes to S3`,
        type: 'success',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save'
      setState('ready')
      setToast({ message, type: 'error' })
    }
  }, [slug, content])

  if (state === 'blocked') return null

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* ── Header Bar ── */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4 min-w-0">
            <a
              href="/admin/drafts"
              className="flex-shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ← Drafts
            </a>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title || slug}
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
            <a
              href={`/articles/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Preview ↗
            </a>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || state === 'saving'}
              className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            >
              {state === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1">
        {/* Loading */}
        {state === 'loading' && (
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
        {state === 'error' && (
          <div className="mx-auto max-w-2xl px-4 py-20">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
              <button
                onClick={fetchContent}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        {(state === 'ready' || state === 'saving') && (
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

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-900/80 dark:text-teal-200'
              : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/80 dark:text-red-200'
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
