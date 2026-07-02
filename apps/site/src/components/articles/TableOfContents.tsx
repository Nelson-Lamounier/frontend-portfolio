'use client'

import type { TocItem } from '@/lib/articles/extract-toc'

interface TableOfContentsProps {
  readonly items: readonly TocItem[]
}

/**
 * In-page navigation generated from the article's H2/H3 heading tree. Anchors
 * target the `id`s stamped by rehype-slug at render, so they resolve natively.
 * Renders nothing for short articles where a TOC adds no value.
 */
export function TableOfContents({ items }: TableOfContentsProps) {
  if (items.length < 3) return null

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="mb-3 font-medium text-zinc-900 dark:text-zinc-100">On this page</p>
      <ul className="space-y-2 border-l border-zinc-200 dark:border-zinc-700/60">
        {items.map((item) => (
          <li key={item.slug} className={item.depth === 3 ? 'pl-7' : 'pl-4'}>
            <a
              href={`#${item.slug}`}
              className="block text-zinc-500 transition-colors hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
