/**
 * AI Agent — Content Generator
 *
 * Bedrock-powered article generation interface with four modes:
 * 1. Upload Draft — drag-and-drop .md file to trigger the publisher pipeline
 * 2. Paste Content — paste/type Markdown, specify a filename, and push to S3
 * 3. Pipeline Tracker — real-time monitoring of Bedrock pipeline with approve/reject
 * 4. Generate Article — (Coming Soon) prompt-based generation
 *
 * Both Upload and Paste modes use the `usePublishDraft` TanStack Query
 * mutation hook, which calls `/api/admin/publish-draft` (upload-only).
 * After upload, the page transitions to Pipeline Tracker mode which uses
 * `usePipelineStatus` for auto-polling and `usePipelineAction` for
 * approve/reject editorial actions.
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
  Clock,
  Eye,
  Archive,
  Rocket,
  AlertCircle,
} from 'lucide-react'
import { usePublishDraft } from '@/lib/hooks/use-publish-draft'
import { usePipelineStatus } from '@/lib/hooks/use-pipeline-status'
import { usePipelineAction } from '@/lib/hooks/use-pipeline-action'
import type { PipelineState } from '@/lib/api/admin-api'
import { useToastStore } from '@/lib/stores/toast-store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible modes for the AI Agent page */
type AgentMode = 'menu' | 'upload' | 'paste' | 'pipeline'

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
// Pipeline stage configuration
// ---------------------------------------------------------------------------

/** Pipeline stage definition for the stepper UI */
interface PipelineStage {
  readonly key: PipelineState
  readonly label: string
  readonly description: string
  readonly icon: React.ReactNode
}

/** Ordered pipeline stages for the stepper component */
const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    key: 'pending',
    label: 'Uploaded',
    description: 'Draft uploaded to S3',
    icon: <CloudUpload className="h-4 w-4" />,
  },
  {
    key: 'processing',
    label: 'Processing',
    description: 'Bedrock multi-agent pipeline running',
    icon: <Bot className="h-4 w-4" />,
  },
  {
    key: 'review',
    label: 'Ready for Review',
    description: 'Article generated, awaiting your decision',
    icon: <Eye className="h-4 w-4" />,
  },
  {
    key: 'published',
    label: 'Published',
    description: 'Article approved and live on the portfolio',
    icon: <Rocket className="h-4 w-4" />,
  },
] as const

/**
 * Returns the numeric index of a pipeline state in the stages array.
 * Used to determine which stages are complete/active/pending.
 *
 * @param state - Current pipeline state
 * @returns Stage index (0-3), or -1 for unknown states
 */
function getStageIndex(state: PipelineState): number {
  if (state === 'pending') return 0
  if (state === 'processing') return 1
  if (state === 'review') return 2
  if (state === 'published') return 3
  // rejected/failed map to the review stage (where the decision was made)
  if (state === 'rejected' || state === 'failed') return 2
  return -1
}

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
// Sub-components — Pipeline Stepper
// ---------------------------------------------------------------------------

/** Props for the PipelineStepper component */
interface PipelineStepperProps {
  readonly currentState: PipelineState
}

/**
 * Visual stepper showing pipeline progress through all stages.
 * Completed stages show green checkmarks, the active stage pulses,
 * and future stages are dimmed.
 *
 * @param props - Stepper configuration
 * @returns Pipeline stepper JSX
 */
function PipelineStepper({ currentState }: PipelineStepperProps) {
  const currentIndex = getStageIndex(currentState)
  const isRejected = currentState === 'rejected'
  const isFailed = currentState === 'failed'

  return (
    <div className="space-y-1">
      {PIPELINE_STAGES.map((stage, index) => {
        const isComplete = index < currentIndex
        const isActive = index === currentIndex
        const isFuture = index > currentIndex

        // Colour logic
        let dotColour = 'bg-zinc-700 text-zinc-500'
        let lineColour = 'bg-zinc-800'
        let labelColour = 'text-zinc-600'

        if (isComplete) {
          dotColour = 'bg-emerald-500/20 text-emerald-400'
          lineColour = 'bg-emerald-500/30'
          labelColour = 'text-emerald-400'
        } else if (isActive) {
          if (isRejected) {
            dotColour = 'bg-amber-500/20 text-amber-400'
            labelColour = 'text-amber-400'
          } else if (isFailed) {
            dotColour = 'bg-red-500/20 text-red-400'
            labelColour = 'text-red-400'
          } else if (stage.key === 'processing') {
            dotColour = 'bg-violet-500/20 text-violet-400'
            labelColour = 'text-violet-400'
          } else {
            dotColour = 'bg-teal-500/20 text-teal-400'
            labelColour = 'text-teal-400'
          }
        }

        return (
          <div key={stage.key}>
            <div className="flex items-center gap-3">
              {/* Stage dot/icon */}
              <div
                className={`
                  relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                  transition-all duration-500 ${dotColour}
                  ${isActive && !isRejected && !isFailed ? 'ring-2 ring-current/20' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isActive && currentState === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isActive && isRejected ? (
                  <Archive className="h-4 w-4" />
                ) : isActive && isFailed ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  stage.icon
                )}

                {/* Pulse ring for active processing stage */}
                {isActive && currentState === 'processing' && (
                  <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/10" />
                )}
              </div>

              {/* Stage text */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium transition-colours duration-300 ${labelColour}`}>
                  {isActive && isRejected
                    ? 'Rejected'
                    : isActive && isFailed
                      ? 'Failed'
                      : stage.label}
                </p>
                <p className={`text-xs ${isFuture ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {isActive && isRejected
                    ? 'Article moved to archive'
                    : isActive && isFailed
                      ? 'Pipeline encountered an error'
                      : stage.description}
                </p>
              </div>

              {/* Status indicator */}
              <div className="shrink-0">
                {isComplete && (
                  <span className="text-[10px] font-medium text-emerald-500">Done</span>
                )}
                {isActive && currentState === 'processing' && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1 w-1 animate-pulse rounded-full bg-violet-500/60"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connector line (not after last stage) */}
            {index < PIPELINE_STAGES.length - 1 && (
              <div className="ml-[17px] flex h-6 items-center">
                <div className={`h-full w-px transition-colours duration-500 ${lineColour}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components — Pipeline Actions
// ---------------------------------------------------------------------------

/** Props for the PipelineActions component */
interface PipelineActionsProps {
  readonly slug: string
  readonly pipelineState: PipelineState
  readonly onActionComplete: () => void
}

/**
 * Approve/Reject action buttons shown when the pipeline reaches
 * the 'review' state. Uses `usePipelineAction` for the mutation.
 *
 * @param props - Action button configuration
 * @returns Pipeline action buttons JSX
 */
function PipelineActions({ slug, pipelineState, onActionComplete }: PipelineActionsProps) {
  const { addToast } = useToastStore()
  const actionMutation = usePipelineAction()

  /** Handle approve action */
  const handleApprove = useCallback(() => {
    actionMutation.mutate(
      { slug, action: 'approve' },
      {
        onSuccess: (data) => {
          if (data.success) {
            addToast('success', `Article "${slug}" published successfully!`)
            onActionComplete()
          } else {
            addToast('error', data.message)
          }
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }, [slug, actionMutation, addToast, onActionComplete])

  /** Handle reject action */
  const handleReject = useCallback(() => {
    actionMutation.mutate(
      { slug, action: 'reject' },
      {
        onSuccess: (data) => {
          if (data.success) {
            addToast('success', `Article "${slug}" rejected and archived.`)
            onActionComplete()
          } else {
            addToast('error', data.message)
          }
        },
        onError: (err) => addToast('error', err.message),
      },
    )
  }, [slug, actionMutation, addToast, onActionComplete])

  if (pipelineState !== 'review') return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-400">
        Your article is ready. Review and decide:
      </p>
      <div className="flex gap-3">
        {/* Approve */}
        <button
          onClick={handleApprove}
          disabled={actionMutation.isPending}
          className="
            flex flex-1 items-center justify-center gap-2 rounded-xl
            bg-gradient-to-r from-emerald-500 to-teal-600
            px-4 py-3 text-sm font-semibold text-white
            shadow-lg shadow-emerald-500/20
            transition-all duration-300
            hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/30
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {actionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Approve & Publish
        </button>

        {/* Reject */}
        <button
          onClick={handleReject}
          disabled={actionMutation.isPending}
          className="
            flex flex-1 items-center justify-center gap-2 rounded-xl
            border border-zinc-700 bg-zinc-900
            px-4 py-3 text-sm font-semibold text-zinc-400
            transition-all duration-300
            hover:border-amber-500/30 hover:bg-zinc-800 hover:text-amber-400
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {actionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Reject & Archive
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * AI Agent page — Bedrock content generation hub.
 * Uses `usePublishDraft` TanStack Query mutation for the upload flow,
 * then transitions to pipeline tracking mode with auto-polling.
 *
 * @returns AI Agent page JSX
 */
export default function AIAgentPage() {
  const { addToast } = useToastStore()

  // ── Shared state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AgentMode>('menu')
  const [pipelineSlug, setPipelineSlug] = useState<string | null>(null)

  // ── Upload mode state ─────────────────────────────────────────────────────
  const [draft, setDraft] = useState<DraftFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Paste mode state ──────────────────────────────────────────────────────
  const [pasteContent, setPasteContent] = useState('')
  const [pasteFilename, setPasteFilename] = useState('')

  // ── TanStack Query hooks ──────────────────────────────────────────────────
  const publishMutation = usePublishDraft()
  const pipelineStatus = usePipelineStatus(pipelineSlug)

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
    pipeline: `Tracking pipeline for "${pipelineSlug ?? '...'}"`,
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
    setPipelineSlug(null)
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
   * On success, transitions to pipeline tracking mode.
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
            addToast('success', `Draft "${data.slug}" uploaded — pipeline triggered!`)
            // Transition to pipeline tracking mode
            setPipelineSlug(data.slug)
            setMode('pipeline')
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
                Upload & Trigger Pipeline
              </button>
            )}

            {/* Upload in progress */}
            {publishMutation.isPending && (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                <span className="text-sm text-zinc-400">Uploading to S3…</span>
              </div>
            )}
          </div>

          {/* Right column — Info panel */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-300">
              Upload Mode
            </h3>
            <p className="text-xs leading-relaxed text-zinc-500">
              Drop a .md file to the left and click &quot;Upload &amp; Trigger Pipeline&quot;.
              The file is uploaded to S3, which automatically triggers the Bedrock
              multi-agent pipeline. Track real-time progress on the next screen.
            </p>
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="text-[11px] font-medium text-zinc-500">
                Pipeline Flow
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-600">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-violet-400">S3 Upload</span>
                <span>→</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-violet-400">Trigger Lambda</span>
                <span>→</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-violet-400">Bedrock Agents</span>
                <span>→</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-400">Review</span>
              </div>
            </div>
          </div>
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
                Upload & Trigger Pipeline
              </button>
            )}

            {/* Upload in progress */}
            {publishMutation.isPending && (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                <span className="text-sm text-zinc-400">Uploading to S3…</span>
              </div>
            )}
          </div>

          {/* Right column — Info panel */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-300">
              Paste Mode
            </h3>
            <p className="text-xs leading-relaxed text-zinc-500">
              Type or paste your Markdown content on the left, give it a filename,
              and click &quot;Upload &amp; Trigger Pipeline&quot;. The content will be
              pushed to S3 as a .md draft, automatically triggering the Bedrock
              multi-agent pipeline.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Pipeline Mode — Real-time tracking with approve/reject           */}
      {/* ================================================================ */}
      {mode === 'pipeline' && pipelineSlug && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Pipeline header card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
                <Bot className="h-5 w-5 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Pipeline Tracker
                </h2>
                <p className="truncate text-xs text-zinc-500">
                  Slug: <code className="rounded bg-zinc-800 px-1.5 text-violet-400">{pipelineSlug}</code>
                </p>
              </div>
              {pipelineStatus.data?.pipelineState === 'processing' && (
                <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1">
                  <Clock className="h-3 w-3 text-violet-400" />
                  <span className="text-[11px] font-medium text-violet-400">
                    Polling every 10s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline stepper */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            {pipelineStatus.isLoading ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                <span className="text-sm text-zinc-400">
                  Connecting to pipeline…
                </span>
              </div>
            ) : pipelineStatus.data ? (
              <PipelineStepper currentState={pipelineStatus.data.pipelineState} />
            ) : (
              <div className="flex items-center justify-center gap-3 py-8">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-zinc-400">
                  Unable to fetch pipeline status
                </span>
              </div>
            )}
          </div>

          {/* Article info (shown when metadata becomes available) */}
          {pipelineStatus.data?.title && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <FileText className="h-3.5 w-3.5" />
                <span>Generated Title</span>
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-200">
                {pipelineStatus.data.title}
              </p>
            </div>
          )}

          {/* Approve/Reject actions (only shown in review state) */}
          {pipelineStatus.data?.pipelineState === 'review' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <PipelineActions
                slug={pipelineSlug}
                pipelineState={pipelineStatus.data.pipelineState}
                onActionComplete={backToMenu}
              />
            </div>
          )}

          {/* Published state — success message with links */}
          {pipelineStatus.data?.pipelineState === 'published' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    Article published successfully!
                  </p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/articles/${pipelineSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Article
                    </a>
                    <a
                      href={`/admin/editor/${pipelineSlug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                    >
                      Edit in Editor
                    </a>
                    <button
                      onClick={backToMenu}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rejected state — info message */}
          {pipelineStatus.data?.pipelineState === 'rejected' && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <Archive className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    Article rejected and archived
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    The generated article has been moved to the archive.
                  </p>
                  <button
                    onClick={backToMenu}
                    className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Failed state — error message */}
          {pipelineStatus.data?.pipelineState === 'failed' && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-300">
                    Pipeline encountered an error
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    The Bedrock pipeline failed to process this article. You can try uploading again.
                  </p>
                  <button
                    onClick={backToMenu}
                    className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colours hover:bg-zinc-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
