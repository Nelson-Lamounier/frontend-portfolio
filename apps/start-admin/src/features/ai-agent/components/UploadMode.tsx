import { useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { CloudUpload, FileText, Trash2, Bot, Loader2 } from 'lucide-react'
import { BYTES_PER_KB, type DraftFile } from './AIAgentTypes'

interface UploadModeProps {
  readonly draft: DraftFile | null
  readonly isDragOver: boolean
  readonly isPending: boolean
  readonly onDragOver: (e: DragEvent<HTMLDivElement>) => void
  readonly onDragLeave: () => void
  readonly onDrop: (e: DragEvent<HTMLDivElement>) => void
  readonly onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
  readonly onClearDraft: () => void
  readonly onPublish: () => void
}

export function UploadMode({
  draft,
  isDragOver,
  isPending,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClearDraft,
  onPublish,
}: UploadModeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left column — File upload */}
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
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
            onChange={onFileSelect}
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
                  onClearDraft()
                }}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
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
        {draft && !isPending && (
          <button
            onClick={onPublish}
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
        {isPending && (
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
  )
}
