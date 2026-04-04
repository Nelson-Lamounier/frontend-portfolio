import { HomeIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'

export interface FullWidthBarStep {
  name: string
  href?: string
  onClick?: () => void
  current: boolean
}

export interface FullWidthBarProps {
  steps: readonly FullWidthBarStep[]
}

export function FullWidthBar({ steps }: FullWidthBarProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex border-b border-white/10 bg-gray-800/50">
      <ol role="list" className="mx-auto flex w-full max-w-7xl space-x-4 px-4 sm:px-6 lg:px-8">
        <li className="flex">
          <div className="flex items-center">
            <Link to="/applications" className="text-gray-400 hover:text-gray-200 transition-colors">
              <HomeIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {steps.map((step) => {
          const isCurrent = step.current
          // This clever trick forces the container to always reserve enough width for the bold version 
          // of the text so that when it toggles between font-medium and font-bold, it never jumps.
          const className = `text-sm transition-colors outline-none flex flex-col items-center justify-center after:content-[attr(data-text)] after:font-bold after:h-0 after:invisible after:overflow-hidden ${
             isCurrent ? 'font-bold text-white' : 'font-medium text-gray-400 hover:text-gray-200'
          }`

          return (
            <li key={step.name} className="flex">
              <div className="flex items-center">
                <svg
                  fill="currentColor"
                  viewBox="0 0 24 44"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="h-full w-6 shrink-0 text-white/10"
                >
                  <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
                </svg>
                <div className="ml-4">
                  {step.onClick ? (
                    <button
                      type="button"
                      onClick={step.onClick}
                      aria-current={isCurrent ? 'page' : undefined}
                      data-text={step.name}
                      className={className}
                    >
                      {step.name}
                    </button>
                  ) : step.href ? (
                    <a
                      href={step.href}
                      aria-current={isCurrent ? 'page' : undefined}
                      data-text={step.name}
                      className={className}
                    >
                      {step.name}
                    </a>
                  ) : (
                    <span
                      aria-current={isCurrent ? 'page' : undefined}
                      data-text={step.name}
                      className={className}
                    >
                      {step.name}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
