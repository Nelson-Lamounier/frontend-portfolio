import { Hash, ClipboardPaste, Bot, Loader2 } from 'lucide-react'
import { MIN_PASTE_CONTENT_LENGTH, BYTES_PER_KB } from './AIAgentTypes'

interface PasteModeProps {
  readonly pasteFilename: string
  readonly setPasteFilename: (name: string) => void
  readonly sanitisedFilename: string
  readonly pasteContent: string
  readonly setPasteContent: (content: string) => void
  readonly pasteCharCount: number
  readonly isPasteReady: boolean
  readonly isPending: boolean
  readonly onPublish: () => void
}

export function PasteMode({
  pasteFilename,
  setPasteFilename,
  sanitisedFilename,
  pasteContent,
  setPasteContent,
  pasteCharCount,
  isPasteReady,
  isPending,
  onPublish
}: PasteModeProps) {
  return (
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
                transition-colors duration-200
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
              transition-colors duration-200
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
        {!isPending && (
          <button
            onClick={onPublish}
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
  )
}
