import type { ReactNode, KeyboardEvent } from 'react'

interface SectionHeaderProps {
  readonly title: string
  readonly description?: ReactNode
  readonly action?: ReactNode
  readonly onClick?: () => void
  readonly isExpanded?: boolean
  readonly expandable?: boolean
}

export function SectionHeader({
  title,
  description,
  action,
  onClick,
  isExpanded,
  expandable,
}: SectionHeaderProps) {
  const isClickable = !!onClick || !!expandable

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  const handleActionKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
    }
  }

  return (
    <div
      className={`border-b border-zinc-200 dark:border-white/10 px-4 py-5 sm:px-6 ${
        isClickable
          ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group focus:outline-none focus:bg-zinc-100/50 dark:focus:bg-white/[0.03]'
          : ''
      }`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-expanded={expandable ? isExpanded : undefined}
    >
      <div className="-mt-4 -ml-4 flex flex-wrap items-center justify-between sm:flex-nowrap">
        <div className="mt-4 ml-4 flex items-center gap-3">
          {expandable && (
            <div
              className={`text-zinc-400 dark:text-zinc-500 transition-colors ${
                isClickable ? 'group-hover:text-zinc-600 dark:group-hover:text-white' : ''
              }`}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
          <div>
            <h3
              className={`text-base font-semibold transition-colors ${
                isClickable
                  ? 'text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300'
                  : 'text-zinc-900 dark:text-white'
              }`}
            >
              {title}
            </h3>
            {description && (
              <div
                className={`mt-1 text-sm transition-colors ${
                  isClickable
                    ? 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {description}
              </div>
            )}
          </div>
        </div>
        {action && (
          <div
            className="mt-4 ml-4 shrink-0"
            onClick={(e) => isClickable && e.stopPropagation()}
            onKeyDown={handleActionKeyDown}
            role="presentation"
          >
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
