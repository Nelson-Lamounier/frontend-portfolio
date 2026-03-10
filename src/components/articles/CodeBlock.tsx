'use client'

/**
 * CodeBlock — Syntax-highlighted code block with Mermaid delegation
 *
 * Used as the `pre` override in MDXRenderer. When the code block's
 * language is "mermaid", it delegates to the Mermaid component instead
 * of rendering syntax-highlighted code.
 *
 * Features:
 *  - File path extraction from first-line comments (// path or # path)
 *  - Line numbers
 *  - Night Owl theme via prism-react-renderer
 *  - Mermaid delegation for architecture diagrams
 */

import { Highlight, themes } from 'prism-react-renderer'
import { Mermaid } from './Mermaid'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string // "language-typescript", "language-mermaid", etc.
}

/**
 * Extract the raw code string and language from a <pre> element's children.
 *
 * MDX renders code fences as:
 *   <pre><code className="language-ts">...code...</code></pre>
 *
 * This helper handles both direct string children and nested <code> elements.
 */
function extractCodeAndLanguage(children: React.ReactNode, className?: string) {
  let code = ''
  let language = className?.replace('language-', '') ?? 'text'

  if (typeof children === 'string') {
    code = children
  } else if (
    children &&
    typeof children === 'object' &&
    'props' in (children as React.ReactElement)
  ) {
    const childProps = (children as React.ReactElement<{ children?: string; className?: string }>).props
    code = typeof childProps.children === 'string' ? childProps.children : ''
    if (childProps.className) {
      language = childProps.className.replace('language-', '')
    }
  }

  return { code: code.trim(), language }
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const { code, language } = extractCodeAndLanguage(children, className)

  // Delegate Mermaid code blocks to the Mermaid component
  if (language === 'mermaid') {
    return <Mermaid chart={code} />
  }

  // Extract file path from first-line comment (if present)
  // Matches: // src/lib/fetcher.ts  or  # config/settings.py
  const lines = code.split('\n')
  const filePathMatch = lines[0]?.match(/^[/#]+\s*(.+)/)
  const filePath = filePathMatch?.[1]?.trim()

  return (
    <div className="group my-6 overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700/50">
      {/* File path header */}
      {filePath && (
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700/50 dark:bg-zinc-800/80">
          <svg
            className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {filePath}
          </span>
        </div>
      )}

      {/* Syntax-highlighted code */}
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto bg-[#011627] p-4 text-sm leading-relaxed">
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  <span className="mr-4 inline-block w-8 select-none text-right text-xs text-zinc-600">
                    {i + 1}
                  </span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  )
}
