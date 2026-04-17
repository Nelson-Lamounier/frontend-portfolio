import { useEffect, useState, useMemo } from 'react'
import { evaluate } from '@mdx-js/mdx'
import * as _jsx_runtime from 'react/jsx-runtime'
import type { EvaluateOptions } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'

// Lightweight mock components matching the site design
function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'error' }) {
  const bg = type === 'warning' ? 'bg-amber-900/20 border-amber-500/50 text-amber-200' :
             type === 'error' ? 'bg-red-900/20 border-red-500/50 text-red-200' :
             'bg-blue-900/20 border-blue-500/50 text-blue-200'
  return (
    <div className={`my-6 rounded-xl border p-4 ${bg}`}>
      {children}
    </div>
  )
}

function SmartImage({ src, fallbackAlt, caption }: { src: string; fallbackAlt?: string; caption?: string }) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-sm">
        <img src={src} alt={fallbackAlt || ''} className="w-full" />
      </div>
      {caption && (
        <figcaption className="mt-3 flex items-start gap-3 px-1">
          <div className="mt-0.5 h-4 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-teal-500 to-emerald-500" />
          <span className="text-sm leading-relaxed text-zinc-400">{caption}</span>
        </figcaption>
      )}
    </figure>
  )
}

function VideoRequest({ src, label, location }: { src: string; label?: string; location?: string }) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
        <video src={src} controls className="w-full" muted loop playsInline />
      </div>
      {(label || location) && (
        <figcaption className="mt-3 flex items-start px-1 text-sm text-zinc-400">
          <span className="font-medium text-emerald-400">{label}</span>
          {location && <span className="ml-2 border-l border-zinc-700 pl-2">{location}</span>}
        </figcaption>
      )}
    </figure>
  )
}

function ProcessTimeline({ children }: { children: React.ReactNode }) {
  return <div className="my-8 border-l-2 border-zinc-800 pl-6">{children}</div>
}

function Mermaid({ chart }: { chart: string }) {
  return (
    <div className="my-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 font-mono text-xs text-zinc-400 overflow-x-auto whitespace-pre">
      {chart}
    </div>
  )
}

const components = {
  Callout,
  SmartImage,
  ImageRequest: SmartImage,
  VideoRequest,
  ProcessTimeline,
  Mermaid,
  MermaidChart: Mermaid,
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm shadow-sm ring-1 ring-inset ring-white/10">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="border-b border-zinc-800 p-4 text-left font-semibold text-zinc-200">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="border-b border-zinc-800/50 p-4 text-zinc-400">{children}</td>,
}

interface MdxPreviewProps {
  content: string
}

export function MdxPreview({ content }: MdxPreviewProps) {
  const [MDXContent, setMDXContent] = useState<React.ElementType | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Pre-process for Mermaid charts just like site
  const sanitizedSource = useMemo(() => {
    return content.replace(
      /<MermaidChart\s+chart=\{\s*`([\s\S]*?)`\s*\}\s*\/>/g,
      '```mermaid\n$1\n```'
    )
  }, [content])

  useEffect(() => {
    let active = true

    evaluate(sanitizedSource, {
      ..._jsx_runtime,
      remarkPlugins: [remarkGfm],
    } as EvaluateOptions)
      .then((mod) => {
        if (active) {
          setMDXContent(() => mod.default)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
        }
      })

    return () => {
      active = false
    }
  }, [sanitizedSource])

  if (error) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-900/20 p-4">
        <h3 className="mb-2 font-semibold text-red-400">MDX Compilation Error</h3>
        <pre className="overflow-auto font-mono text-xs text-red-300">{error}</pre>
      </div>
    )
  }

  if (!MDXContent) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-3/4 rounded bg-zinc-800"></div>
        <div className="h-4 w-full rounded bg-zinc-800"></div>
        <div className="h-4 w-5/6 rounded bg-zinc-800"></div>
      </div>
    )
  }

  return (
    <div className="prose prose-invert prose-zinc max-w-none">
      <MDXContent components={components} />
    </div>
  )
}
