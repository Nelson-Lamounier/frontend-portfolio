import { useRef } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { PhotoIcon } from '@heroicons/react/24/solid'
import { BYTES_PER_KB, MIN_PASTE_CONTENT_LENGTH, type DraftFile } from './AIAgentTypes'


export interface AiArticleFormProps {
  readonly draft: DraftFile | null
  readonly isDragOver: boolean
  readonly isPending: boolean
  readonly onDragOver: (e: DragEvent<HTMLDivElement>) => void
  readonly onDragLeave: () => void
  readonly onDrop: (e: DragEvent<HTMLDivElement>) => void
  readonly onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
  readonly onClearDraft: () => void
  readonly onPublish: () => void

  readonly pasteFilename?: string
  readonly setPasteFilename?: (name: string) => void
  readonly sanitisedFilename?: string
  readonly pasteContent?: string
  readonly setPasteContent?: (content: string) => void
  readonly pasteCharCount?: number
  readonly isPasteReady?: boolean
}

export function AiArticleForm({
  draft,
  isDragOver,
  isPending,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClearDraft,
  onPublish,
  pasteFilename = '',
  setPasteFilename,
  sanitisedFilename = '',
  pasteContent = '',
  setPasteContent,
  pasteCharCount = 0,
  isPasteReady = false,
}: AiArticleFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <form>
        <div className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-b border-white/10 pb-12">
          <div>
            <h2 className="text-base/7 font-semibold text-white">Generate Article</h2>
          <p className="mt-1 text-sm/6 text-zinc-400">
            Generate an article based on your knowledge and the topic you provide.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="paste-filename" className="block text-sm/6 font-medium text-white">
                Article Filename
              </label>
              <div className="mt-2">
                <div className="flex items-center rounded-md bg-white/5 pl-3 outline-1 -outline-offset-1 outline-white/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-500">
                  <div className="shrink-0 text-base text-zinc-400 select-none sm:text-sm/6">slug:</div>
                  <input
                    id="paste-filename"
                    name="paste-filename"
                    type="text"
                    placeholder="my-article-title"
                    value={pasteFilename}
                    onChange={(e) => setPasteFilename?.(e.target.value)}
                    className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-2 text-base text-white placeholder:text-zinc-500 focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>
              {sanitisedFilename && (
                <p className="mt-1.5 text-xs/5 text-zinc-400">
                  Will be saved as: <code className="text-indigo-400">{sanitisedFilename}</code>
                </p>
              )}
            </div>

            <div className="col-span-full">
              <label htmlFor="paste-content" className="block text-sm/6 font-medium text-white">
                Markdown Content
              </label>
              <div className="mt-2">
                <textarea
                  id="paste-content"
                  name="paste-content"
                  rows={8}
                  value={pasteContent}
                  onChange={(e) => setPasteContent?.(e.target.value)}
                  placeholder="Paste your Markdown content here..."
                  className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                />
              </div>
              <div className="mt-3 flex justify-between text-sm/6 text-zinc-400">
                <span>
                  {pasteCharCount.toLocaleString()} chars
                  {pasteCharCount > 0 && ` · ${(new Blob([pasteContent]).size / BYTES_PER_KB).toFixed(1)} KB`}
                </span>
                {Math.max(0, MIN_PASTE_CONTENT_LENGTH - pasteCharCount) > 0 ? (
                  <span className="text-amber-500/80">Min {MIN_PASTE_CONTENT_LENGTH} chars required</span>
                ) : null}
              </div>
            </div>




          </div>
        </div>

        <div>
                        <div className="col-span-full">
              <label htmlFor="cover-photo" className="block text-sm/6 font-medium text-white">
                Draft document
              </label>
              <div 
                className={`mt-2 flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors cursor-pointer ${
                  isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/25 hover:border-white/40'
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {!draft ? (
                  <div className="text-center">
                    <PhotoIcon aria-hidden="true" className="mx-auto size-12 text-zinc-600" />
                    <div className="mt-4 flex text-sm/6 text-zinc-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-400 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-500 hover:text-indigo-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Upload a file</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          accept=".md"
                          className="sr-only" 
                          ref={fileInputRef}
                          onChange={onFileSelect}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs/5 text-zinc-400">Markdown files only (.md)</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <p className="text-sm font-medium text-white">{draft.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{(draft.size / BYTES_PER_KB).toFixed(1)} KB</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClearDraft()
                        }}
                        className="mt-4 rounded-md px-3 py-2 text-sm font-semibold text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
                      >
                        Remove file
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>



        </div>
      </div>


      </div>

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <button 
          type="button" 
          onClick={onClearDraft}
          disabled={isPending}
          className="text-sm/6 font-semibold text-white hover:text-zinc-300 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={(!draft && !isPasteReady) || isPending}
          className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Generating...' : 'Generate Article'}
        </button>
      </div>
    </form>
    
  </>
  )
}
