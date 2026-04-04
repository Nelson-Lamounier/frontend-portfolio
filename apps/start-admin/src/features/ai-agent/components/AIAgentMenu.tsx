import { Upload, FileText, Sparkles } from 'lucide-react'
import type { AgentMode } from './AIAgentTypes'

interface AIAgentMenuProps {
  readonly setMode: (mode: AgentMode) => void
}

export function AIAgentMenu({ setMode }: AIAgentMenuProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Upload Mode — ACTIVE */}
      <button
        onClick={() => setMode('upload')}
        className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left transition-all duration-300 hover:border-teal-500/30 hover:bg-zinc-800/50 hover:shadow-lg hover:shadow-teal-500/5"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 transition-colors group-hover:bg-teal-500/20">
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
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
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
  )
}
