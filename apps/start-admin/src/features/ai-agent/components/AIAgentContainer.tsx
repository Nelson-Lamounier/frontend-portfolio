import { useState, useCallback } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { ArrowLeft, Bot } from 'lucide-react'
import { usePublishDraft } from '@/lib/hooks/use-publish-draft'
import { useToastStore } from '@/lib/stores/toast-store'

import {
  type AgentMode,
  type DraftFile,
  PREVIEW_LINE_COUNT,
  MIN_PASTE_CONTENT_LENGTH,
  slugifyFilename,
} from './AIAgentTypes'

import { AIAgentMenu } from './AIAgentMenu'
import { UploadMode } from './UploadMode'
import { PasteMode } from './PasteMode'
import { PipelineMode } from './PipelineMode'

export function AIAgentContainer() {
  const { addToast } = useToastStore()

  // ── Shared state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AgentMode>('menu')
  const [pipelineSlug, setPipelineSlug] = useState<string | null>(null)

  // ── Upload mode state ─────────────────────────────────────────────────────
  const [draft, setDraft] = useState<DraftFile | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // ── Paste mode state ──────────────────────────────────────────────────────
  const [pasteContent, setPasteContent] = useState('')
  const [pasteFilename, setPasteFilename] = useState('')

  // ── TanStack Query hooks ──────────────────────────────────────────────────
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
    pipeline: `Tracking pipeline for "${pipelineSlug ?? '...'}"`,
  }

  // ── Upload handlers ───────────────────────────────────────────────────────
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

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile],
  )

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
  const backToMenu = useCallback(() => {
    setMode('menu')
    setDraft(null)
    setPasteContent('')
    setPasteFilename('')
    setPipelineSlug(null)
    publishMutation.reset()
  }, [publishMutation])

  const clearDraft = useCallback(() => {
    setDraft(null)
    setPasteContent('')
    setPasteFilename('')
    publishMutation.reset()
  }, [publishMutation])

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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
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

      {mode === 'menu' && <AIAgentMenu setMode={setMode} />}

      {mode === 'upload' && (
        <UploadMode
          draft={draft}
          isDragOver={isDragOver}
          isPending={publishMutation.isPending}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onClearDraft={clearDraft}
          onPublish={handlePublish}
        />
      )}

      {mode === 'paste' && (
        <PasteMode
          pasteFilename={pasteFilename}
          setPasteFilename={setPasteFilename}
          sanitisedFilename={sanitisedFilename}
          pasteContent={pasteContent}
          setPasteContent={setPasteContent}
          pasteCharCount={pasteCharCount}
          isPasteReady={isPasteReady}
          isPending={publishMutation.isPending}
          onPublish={handlePublish}
        />
      )}

      {mode === 'pipeline' && pipelineSlug && (
        <PipelineMode
          pipelineSlug={pipelineSlug}
          backToMenu={backToMenu}
        />
      )}
    </div>
  )
}
