'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface MermaidProps {
  chart: string
  caption?: string
}

export function Mermaid({ chart, caption }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgWrapperRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      try {
        const mermaid = (await import('mermaid')).default

        const isDark = document.documentElement.classList.contains('dark')

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            padding: 24,
            nodeSpacing: 40,
            rankSpacing: 50,
          },
          themeVariables: isDark
            ? {
                primaryColor: '#6366f1',
                primaryTextColor: '#f1f5f9',
                primaryBorderColor: '#4338ca',
                lineColor: '#818cf8',
                secondaryColor: '#1e1b4b',
                tertiaryColor: '#0f172a',
                noteBkgColor: '#1e1b4b',
                noteTextColor: '#e2e8f0',
                noteBorderColor: '#4338ca',
                background: '#0f172a',
                mainBkg: '#1e1b4b',
                nodeBorder: '#6366f1',
                clusterBkg: '#1e1b4b',
                clusterBorder: '#4338ca',
                edgeLabelBackground: '#1e1b4b',
              }
            : {
                primaryColor: '#6366f1',
                primaryTextColor: '#1e293b',
                primaryBorderColor: '#a5b4fc',
                lineColor: '#6366f1',
                secondaryColor: '#eef2ff',
                tertiaryColor: '#e0e7ff',
                background: '#ffffff',
                mainBkg: '#eef2ff',
                nodeBorder: '#a5b4fc',
                clusterBkg: '#f5f3ff',
                clusterBorder: '#c7d2fe',
                edgeLabelBackground: '#eef2ff',
              },
        })

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim())

        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('Mermaid render error:', err)
          setError(
            err instanceof Error ? err.message : 'Failed to render diagram',
          )
        }
      }
    }

    renderDiagram()

    return () => {
      cancelled = true
    }
  }, [chart])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = svgWrapperRef.current
    if (!wrapper) return

    const rect = wrapper.getBoundingClientRect()
    // Calculate cursor position as percentage of the container
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    wrapper.style.transformOrigin = `${x}% ${y}%`
  }, [])

  const handleMouseEnter = useCallback(() => setIsHovering(true), [])
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    // Reset transform-origin to center when leaving
    if (svgWrapperRef.current) {
      svgWrapperRef.current.style.transformOrigin = '50% 50%'
    }
  }, [])

  if (error) {
    return (
      <div className="my-8 rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 dark:border-red-800/50 dark:from-red-950/30 dark:to-rose-950/20">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            Diagram render error
          </p>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-red-100/50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </pre>
      </div>
    )
  }

  return (
    <figure className="group my-10">
      {/* Diagram container — fixed height, overflow hidden for zoom effect */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative cursor-zoom-in overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 shadow-sm transition-shadow duration-300 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 dark:border-indigo-900/40 dark:from-slate-900 dark:via-zinc-900 dark:to-indigo-950/30 dark:hover:border-indigo-700/50 dark:hover:shadow-indigo-900/30"
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* SVG wrapper — scales on hover with transform-origin following cursor */}
        <div className="h-[360px] p-6">
          <div
            ref={svgWrapperRef}
            className="h-full w-full transition-transform duration-300 ease-out [&_svg]:mx-auto [&_svg]:max-h-full [&_svg]:w-auto"
            style={{
              transform: isHovering ? 'scale(2)' : 'scale(1)',
              transformOrigin: '50% 50%',
            }}
            dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
          />
        </div>

        {/* Zoom hint — shown only when not hovering */}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center pb-4 pt-8 transition-opacity duration-300 ${
            isHovering
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          }`}
        >
          <span className="flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-indigo-500 backdrop-blur-sm dark:border-indigo-800/60 dark:bg-zinc-800/70 dark:text-indigo-300">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
              />
            </svg>
            Hover to zoom
          </span>
        </div>
      </div>

      {/* Caption with accent bar */}
      {caption && (
        <figcaption className="mt-4 flex items-start gap-3 px-1">
          <div className="mt-0.5 h-4 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
          <span className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {caption}
          </span>
        </figcaption>
      )}
    </figure>
  )
}
