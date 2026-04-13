import { CheckIcon } from '@heroicons/react/20/solid'

export type ProgressStepStatus = 'complete' | 'current' | 'upcoming'

export interface ProgressStep {
  name: string
  description?: string
  status: ProgressStepStatus
  href?: string
  onClick?: () => void
}

interface ProgressBarProps {
  readonly steps: ProgressStep[]
}

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function ProgressBar({ steps }: ProgressBarProps) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, stepIdx) => {
          const isLast = stepIdx === steps.length - 1
          
          // Determine if we should render A tag or Button tag based on props
          const Component = step.onClick ? 'button' : 'a'
          const componentProps = step.onClick 
            ? { type: 'button' as const, onClick: step.onClick } 
            : { href: step.href ?? '#' }

          return (
            <li key={step.name} className={classNames(!isLast ? 'pb-10' : '', 'relative')}>
              {step.status === 'complete' ? (
                <>
                  {!isLast ? (
                    <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-indigo-500" />
                  ) : null}
                  <Component {...componentProps} className="group relative flex w-full items-start text-left">
                    <span className="flex h-9 items-center">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-indigo-500 group-hover:bg-indigo-600">
                        <CheckIcon aria-hidden="true" className="size-5 text-white" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-white">{step.name}</span>
                      {step.description && <span className="text-sm text-zinc-400">{step.description}</span>}
                    </span>
                  </Component>
                </>
              ) : step.status === 'current' ? (
                <>
                  {!isLast ? (
                    <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-zinc-700" />
                  ) : null}
                  <Component {...componentProps} aria-current="step" className="group relative flex w-full items-start text-left">
                    <span aria-hidden="true" className="flex h-9 items-center">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-indigo-500 bg-zinc-900">
                        <span className="size-2.5 rounded-full bg-indigo-500" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-indigo-400">{step.name}</span>
                      {step.description && <span className="text-sm text-zinc-400">{step.description}</span>}
                    </span>
                  </Component>
                </>
              ) : (
                <>
                  {!isLast ? (
                    <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-white/15" />
                  ) : null}
                  <Component {...componentProps} className="group relative flex w-full items-start text-left">
                    <span aria-hidden="true" className="flex h-9 items-center">
                      <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-white/15 bg-zinc-900 group-hover:border-white/25">
                        <span className="size-2.5 rounded-full bg-transparent group-hover:bg-white/15" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-zinc-400">{step.name}</span>
                      {step.description && <span className="text-sm text-zinc-400">{step.description}</span>}
                    </span>
                  </Component>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
