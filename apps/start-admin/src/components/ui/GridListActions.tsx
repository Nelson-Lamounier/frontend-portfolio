import * as React from 'react'
import { Link } from '@tanstack/react-router'

export interface GridListAction {
  title: string
  href?: string
  onClick?: () => void
  icon: React.ElementType
  iconForeground: string
  iconBackground: string
  description?: string
}

export interface GridListActionsProps {
  actions: GridListAction[]
}

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function GridListActions({ actions }: GridListActionsProps) {
  return (
    <div className="divide-y divide-zinc-200 dark:divide-white/10 overflow-hidden rounded-lg bg-white dark:bg-zinc-900 outline -outline-offset-1 outline-zinc-200 dark:outline-white/20 sm:grid sm:grid-cols-2 sm:divide-y-0 shadow-sm">
      {actions.map((action, actionIdx) => (
        <div
          key={action.title}
          className={classNames(
            actionIdx === 0 ? 'rounded-tl-lg rounded-tr-lg sm:rounded-tr-none' : '',
            actionIdx === 1 ? 'sm:rounded-tr-lg' : '',
            actionIdx === actions.length - 2 ? 'sm:rounded-bl-lg' : '',
            actionIdx === actions.length - 1 ? 'rounded-br-lg rounded-bl-lg sm:rounded-bl-none' : '',
            'group relative border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-800/50 p-6 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-teal-500 sm:odd:not-nth-last-2:border-b sm:even:border-l sm:even:not-last:border-b transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800',
          )}
        >
          <div>
            <span className={classNames(action.iconBackground, action.iconForeground, 'inline-flex rounded-lg p-3')}>
              <action.icon aria-hidden="true" className="size-6" />
            </span>
          </div>
          <div className="mt-8">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              {action.href ? (
                <Link to={action.href as any} className="focus:outline-hidden" onClick={action.onClick}>
                  {/* Extend touch target to entire panel */}
                  <span aria-hidden="true" className="absolute inset-0" />
                  {action.title}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="focus:outline-hidden text-left before:absolute before:inset-0"
                >
                  {action.title}
                </button>
              )}
            </h3>
            {action.description && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {action.description}
              </p>
            )}
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-6 right-6 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors"
          >
            <svg fill="currentColor" viewBox="0 0 24 24" className="size-6">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </div>
      ))}
    </div>
  )
}
