import { useState } from 'react'
import { ArticleVersionsList } from './ArticleVersionsList'
import type { ArticleWithSlug } from '@/lib/types/article.types'

interface ArticleAccordionProps {
  readonly article: ArticleWithSlug
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft:      { label: 'Draft',       className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  published:  { label: 'Published',   className: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
  flagged:    { label: 'Flagged',     className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  review:     { label: 'In Review',   className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  rejected:   { label: 'Rejected',    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  processing: { label: 'Processing',  className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400' },
}

export function ArticleAccordion({ article }: ArticleAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const badge = STATUS_BADGE[article.status ?? 'draft'] ?? {
    label: article.status ?? 'Unknown',
    className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
  }

  const formattedDate = new Date(article.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className={isExpanded ? 'relative z-10' : 'relative z-0'}>
      {/* ── Accordion Header ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full text-left px-4 py-4 sm:px-6 hover:bg-zinc-50 dark:hover:bg-white/2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 rounded-lg"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: chevron + title + meta */}
          <div className="flex items-start gap-3 min-w-0">
            <svg
              className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {/* Status badge — visible without expanding */}
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
                <time dateTime={article.date} className="text-xs text-zinc-400">
                  {formattedDate}
                </time>
                {article.readingTimeMinutes && (
                  <span className="text-xs text-zinc-400">{article.readingTimeMinutes} min read</span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {article.title}
              </h3>

              {(article.description || article.aiSummary) && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {article.description || article.aiSummary}
                </p>
              )}

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: category pill */}
          {article.category && (
            <span className="shrink-0 hidden sm:inline text-xs text-zinc-400 border border-zinc-200 dark:border-white/10 rounded px-2 py-0.5">
              {article.category}
            </span>
          )}
        </div>
      </button>

      {/* ── Expanded Content — no transform animation to avoid stacking context ── */}
      {isExpanded && (
        <div className="border-t border-zinc-200 dark:border-white/10">
          <ArticleVersionsList article={article} />
        </div>
      )}
    </div>
  )
}
