/**
 * AI Agent — Content Generator
 *
 * Bedrock-powered article generation interface with three modes:
 * 1. Upload Draft — drag-and-drop .md file to trigger the publisher pipeline
 * 2. Paste Content — paste/type Markdown, specify a filename, and push to S3
 * 3. Generate Article — (Coming Soon) prompt-based generation
 *
 * Both Upload and Paste modes use the `usePublishDraft` TanStack Query
 * mutation hook, which calls `/api/admin/publish-draft` and automatically
 * invalidates the articles cache on success.
 *
 * Route: /admin/ai-agent
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  Bot,
  Upload,
  FileText,
  Sparkles,
  CloudUpload,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  ExternalLink,
  ArrowLeft,
  ClipboardPaste,
  Hash,
} from 'lucide-react'
import { usePublishDraft } from '@/lib/hooks/use-publish-draft'
import type { PublishDraftResponse } from '@/lib/api/admin-api'
import { useToastStore } from '@/lib/stores/toast-store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible modes for the AI Agent page */
type AgentMode = 'menu' | 'upload' | 'paste'

/** File preview data (used by Upload mode) */
interface DraftFile {
  readonly name: string
  readonly content: string
  readonly size: number
  readonly preview: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of preview lines to display in Upload mode */
const PREVIEW_LINE_COUNT = 8

/** Minimum content length to enable the paste publish button */
const MIN_PASTE_CONTENT_LENGTH = 20

/** Byte conversion factor */
const BYTES_PER_KB = 1024

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Slugify a filename string — lowercase, strip non-alphanumeric characters,
 * replace spaces/underscores with hyphens, and ensure `.md` extension.
 *
 * @param raw - Raw filename input
 * @returns Sanitised filename ending in .md
 */
function slugifyFilename(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/\.md$/i, '')          // strip existing .md
    .replace(/[^a-z0-9\s_-]/g, '') // remove special chars
    .replace(/[\s_]+/g, '-')       // spaces/underscores → hyphens
    .replace(/-+/g, '-')           // collapse consecutive hyphens
    .replace(/^-|-$/g, '')         // trim leading/trailing hyphens

  return base ? `${base}.md` : ''
}

// ---------------------------------------------------------------------------
// Sub-components — Status Panel (shared between Upload & Paste modes)
// ---------------------------------------------------------------------------

/** Props for the shared status panel */
interface StatusPanelProps {
  readonly isPending: boolean
  readonly isSuccess: boolean
  readonly isError: boolean
  readonly result: PublishDraftResponse | null
  readonly onRetry: () => void
  readonly onClear: () => void
  readonly modeLabel: string
  readonly modeDescription: string
}

/**
 * Shared processing/success/error status panel used by both
 * Upload and Paste modes.
 *
 * @param props - Status panel props
 * @returns Status panel JSX
 */
function StatusPanel({
  isPending,
  isSuccess,
  isError,
  result,
  onRetry,
  onClear,
  modeLabel,
  modeDescription,
}: StatusPanelProps) {
  return (
    <div className="space-y-4">
      {isPending && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/20">
                <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Bedrock is processing your article...
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                This typically takes 1–3 minutes.
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500/60"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isSuccess && result && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-300">{result.message}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Slug: <code className="rounded bg-zinc-800 px-1 text-emerald-400">{result.slug}</code>
              </p>
              {result.details && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={result.details.s3Published ? 'text-emerald-400' : 'text-zinc-500'}>
                      {result.details.s3Published ? '✓' : '○'}
                    </span>
                    <span className="text-zinc-400">S3 published output</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={result.details.dynamoMetadata ? 'text-emerald-400' : 'text-zinc-500'}>
                      {result.details.dynamoMetadata ? '✓' : '○'}
                    </span>
                    <span className="text-zinc-400">DynamoDB metadata</span>
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <a
                  href="/admin/drafts"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  View in Drafts
                </a>
                <button
                  onClick={onClear}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                >
                  Create Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isError && result && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-300">{result.message}</p>
              {result.error && (
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-2 text-xs text-red-400/80">
                  {result.error}
                </pre>
              )}
              <div className="mt-4">
                <button
                  onClick={onRetry}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isPending && !isSuccess && !isError && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            {modeLabel}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-500">
            {modeDescription}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * AI Agent page — Bedrock content generation hub.
 * Uses `usePublishDraft` TanStack Query mutation for the publish flow.
 *
 * @returns AI Agent page JSX
 */
export default function AIAgentPage() {
  const { addToast } = useToastStore()

  // ── Shared state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AgentMode>('menu')

  // ── Upload mode state ─────────────────────────────────────────────────────
  const [draft, setDraft] = useState<DraftFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Paste mode state ──────────────────────────────────────────────────────
  const [pasteContent, setPasteContent] = useState('')
  const [pasteFilename, setPasteFilename] = useState('')

  // ── TanStack Query mutation ───────────────────────────────────────────────
  const publishMutation = usePublishDraft()

  // ── Derived values ────────────────────────────────────────────────────────
  const sanitisedFilename = slugifyFilename(pasteFilename)
  const pasteCharCount = pasteContent.length
  const isPasteReady =
    sanitisedFilename.length > 0 &&
    pasteContent.length >= MIN_PASTE_CONTENT_LENGTH

  // ── Mode subtitle ─────────────────────────────────────────────────────────
  const subtitle: Record<AgentMode, string> = {
    menu: 'Bedrock-powered content generation and transformation',
    upload: 'Upload a Markdown draft to create an article',
    paste: 'Paste your Markdown content and generate an article',
  }

  // ── Upload handlers ───────────────────────────────────────────────────────

  /**
   * Process a selected file — read its content and set up preview.
   *
   * @param file - The selected .md File object
   */
  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const lines = content.split('\n')
      const preview = lines.slice(0, PREVIEW_LINE_COUNT).join('\n')

      setDraft({
        name: file.name,
        content,
        size: file.size,
        preview: lines.length > PREVIEW_LINE_COUNT
          ? `${preview}\n...`
          : preview,
      })
      publishMutation.reset()
    }
    reader.readAsText(file)
  }, [publishMutation])

  /** Handle file input change */
  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  /** Handle drag events */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.md')) processFile(file)
    },
    [processFile],
  )

  // ── Shared handlers ───────────────────────────────────────────────────────

  /** Reset to menu state */
  const backToMenu = useCallback(() => {
    setMode('menu')
    setDraft(null)
    setPasteContent('')
    setPasteFilename('')
    publishMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [publishMutation])

  /** Clear current draft/paste without changing mode */
  const clearDraft = useCallback(() => {
    setDraft(null)
    setPasteContent('')
    setPasteFilename('')
    publishMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [publishMutation])

  /**
   * Submit content to the publish API via TanStack mutation.
   * Works for both Upload (uses draft) and Paste (uses pasteContent) modes.
   */
  const handlePublish = useCallback(() => {
    let fileName: string
    let content: string

    if (mode === 'paste') {
      if (!isPasteReady) return
      fileName = sanitisedFilename
      content = pasteContent
    } else {
      if (!draft) return
      fileName = draft.name
      content = draft.content
    }

    publishMutation.mutate(
      { fileName, content },
      {
        onSuccess: (data) => {
          if (data.success) {
            addToast('success', `Article "${data.slug}" created successfully.`)
          } else {
            addToast('error', data.message)
          }
        },
        onError: (err) => {
          addToast('error', err.message)
        },
      },
    )
  }, [mode, draft, pasteContent, sanitisedFilename, isPasteReady, publishMutation, addToast])

  // Build a result-like object for the StatusPanel from mutation state
  const mutationResult: PublishDraftResponse | null = publishMutation.data ?? (
    publishMutation.error
      ? {
          success: false,
          slug: mode === 'paste' ? sanitisedFilename.replace(/\.md$/i, '') : (draft?.name.replace(/\.md$/i, '') ?? ''),
          message: 'Network error — could not reach the server',
          error: publishMutation.error.message,
        }
      : null
  )

  // Determine error state — either mutation threw OR API returned success: false
  const isPublishError = publishMutation.isError || (publishMutation.isSuccess && mutationResult?.success === false)
  const isPublishSuccess = publishMutation.isSuccess && mutationResult?.success === true

  return (
    <div className="px-6 py-8 sm:px-8 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          {mode !== 'menu' && (
            <button
              onClick={backToMenu}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colours hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Back to menu"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              AI Agent
            </h1>
            <p className="text-sm text-zinc-500">
              {subtitle[mode]}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Menu Mode — Show feature cards                                   */}
      {/* ================================================================ */}
      {mode === 'menu' && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Upload Mode — ACTIVE */}
          <button
            onClick={() => setMode('upload')}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left transition-all duration-300 hover:border-teal-500/30 hover:bg-zinc-800/50 hover:shadow-lg hover:shadow-teal-500/5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 transition-colours group-hover:bg-teal-500/20">
              <Upload className="h-5 w-5 text-teal-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">Upload Draft</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Drag and drop a .md file to transform it into a published article
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-[11px] font-medium text-teal-400">
              Ready
            </div>
          </button>

          {/* Paste Mode — ACTIVE */}
          <button
            onClick={() => setMode('paste')}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left transition-all duration-300 hover:border-violet-500/30 hover:bg-zinc-800/50 hover:shadow-lg hover:shadow-violet-500/5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 transition-colours group-hover:bg-violet-500/20">
              <FileText className="h-5 w-5 text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">Paste Content</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Paste raw Markdown content, name it, and let Bedrock create an article
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-400">
              Ready
            </div>
          </button>

          {/* Generate Mode — Coming Soon */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 opacity-60">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              <Sparkles className="h-5 w-5 text-zinc-500" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-400">Generate Article</h3>
            <p className="mt-1 text-xs text-zinc-600">
              Describe a topic and Bedrock will generate a complete article
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-500">
              Coming Soon
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Upload Mode — Drag-and-drop file upload                          */}
      {/* ================================================================ */}
      {mode === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column — File upload */}
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
              className={`
                group relative cursor-pointer rounded-xl border-2 border-dashed
                transition-all duration-300 ease-out
                ${isDragOver
                  ? 'border-violet-400 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50'
                }
                ${draft ? 'p-4' : 'p-10'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select Markdown file"
              />

              {!draft ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={`
                    flex h-14 w-14 items-center justify-center rounded-2xl
                    transition-all duration-300
                    ${isDragOver
                      ? 'bg-violet-500/20 text-violet-400 scale-110'
                      : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-400'
                    }
                  `}>
                    <CloudUpload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      Drop your <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-violet-400">.md</code> file here
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      or click to browse
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                    <FileText className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {draft.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {(draft.size / BYTES_PER_KB).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearDraft()
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 transition-colours hover:bg-zinc-800 hover:text-zinc-300"
                    aria-label="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* File preview */}
            {draft && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Preview
                </h3>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400">
                  {draft.preview}
                </pre>
              </div>
            )}

            {/* Publish button */}
            {draft && !publishMutation.isPending && (
              <button
                onClick={handlePublish}
                className="
                  flex w-full items-center justify-center gap-2 rounded-xl
                  bg-gradient-to-r from-violet-500 to-purple-600
                  px-6 py-3 text-sm font-semibold text-white
                  shadow-lg shadow-violet-500/20
                  transition-all duration-300
                  hover:from-violet-600 hover:to-purple-700 hover:shadow-xl hover:shadow-violet-500/30
                  active:scale-[0.98]
                "
              >
                <Bot className="h-4 w-4" />
                Generate Article
              </button>
            )}
          </div>

          {/* Right column — Status */}
          <StatusPanel
            isPending={publishMutation.isPending}
            isSuccess={isPublishSuccess}
            isError={isPublishError}
            result={mutationResult}
            onRetry={handlePublish}
            onClear={clearDraft}
            modeLabel="Upload Mode"
            modeDescription={
              'Drop a .md file to the left and click "Generate Article". The Bedrock agent will ' +
              'transform your Markdown into a fully structured MDX article with metadata, reading ' +
              'time, and component references.'
            }
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* Paste Mode — Textarea with filename input                        */}
      {/* ================================================================ */}
      {mode === 'paste' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column — Content input */}
          <div className="space-y-4">
            {/* Filename input */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <label
                htmlFor="paste-filename"
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                <Hash className="h-3.5 w-3.5" />
                Article Filename
              </label>
              <div className="relative">
                <input
                  id="paste-filename"
                  type="text"
                  placeholder="my-article-title"
                  value={pasteFilename}
                  onChange={(e) => setPasteFilename(e.target.value)}
                  className="
                    w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5
                    text-sm text-zinc-200 placeholder-zinc-600
                    transition-colours duration-200
                    focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30
                  "
                />
                {sanitisedFilename && (
                  <p className="mt-1.5 text-[11px] text-zinc-600">
                    Will be saved as: <code className="rounded bg-zinc-800 px-1 text-violet-400/80">{sanitisedFilename}</code>
                  </p>
                )}
              </div>
            </div>

            {/* Markdown content textarea */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <label
                htmlFor="paste-content"
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Markdown Content
              </label>
              <textarea
                id="paste-content"
                rows={16}
                placeholder={
                  '# My Article Title\n\n' +
                  'Paste your Markdown content here...\n\n' +
                  '## Section One\n\n' +
                  'Your article text goes here.'
                }
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                className="
                  w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950
                  px-3 py-3 font-mono text-sm leading-relaxed text-zinc-300
                  placeholder-zinc-700
                  transition-colours duration-200
                  focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30
                "
              />
              {/* Character count + size indicator */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
                <span>
                  {pasteCharCount.toLocaleString()} characters
                  {pasteCharCount > 0 && (
                    <> · {(new Blob([pasteContent]).size / BYTES_PER_KB).toFixed(1)} KB</>
                  )}
                </span>
                {pasteCharCount > 0 && pasteCharCount < MIN_PASTE_CONTENT_LENGTH && (
                  <span className="text-amber-500/80">
                    Minimum {MIN_PASTE_CONTENT_LENGTH} characters required
                  </span>
                )}
              </div>
            </div>

            {/* Publish button */}
            {!publishMutation.isPending && (
              <button
                onClick={handlePublish}
                disabled={!isPasteReady}
                className="
                  flex w-full items-center justify-center gap-2 rounded-xl
                  bg-gradient-to-r from-violet-500 to-purple-600
                  px-6 py-3 text-sm font-semibold text-white
                  shadow-lg shadow-violet-500/20
                  transition-all duration-300
                  hover:from-violet-600 hover:to-purple-700 hover:shadow-xl hover:shadow-violet-500/30
                  active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:from-violet-500 disabled:hover:to-purple-600
                "
              >
                <Bot className="h-4 w-4" />
                Generate Article
              </button>
            )}
          </div>

          {/* Right column — Status */}
          <StatusPanel
            isPending={publishMutation.isPending}
            isSuccess={isPublishSuccess}
            isError={isPublishError}
            result={mutationResult}
            onRetry={handlePublish}
            onClear={clearDraft}
            modeLabel="Paste Mode"
            modeDescription={
              'Type or paste your Markdown content on the left, give it a filename, and click ' +
              '"Generate Article". The content will be pushed to S3 as a .md draft, triggering ' +
              'the Bedrock agent to create a fully structured MDX article with metadata and components.'
            }
          />
        </div>
      )}
    </div>
  )
}
