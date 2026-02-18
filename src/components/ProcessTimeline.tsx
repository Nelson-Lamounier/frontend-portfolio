interface ProcessStep {
  title: string
  description: string
}

interface ProcessTimelineProps {
  steps: ProcessStep[]
}

export function ProcessTimeline({ steps }: ProcessTimelineProps) {
  return (
    <div className="my-8 rounded-xl border border-zinc-100 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1

          return (
            <li key={index} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[15px] top-[36px] h-[calc(100%-20px)] w-px bg-gradient-to-b from-teal-400 to-teal-200 dark:from-teal-500 dark:to-teal-800" />
              )}

              {/* Step number circle */}
              <div className="relative z-10 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-xs font-bold text-white shadow-sm shadow-teal-500/30 dark:from-teal-500 dark:to-teal-700">
                {index + 1}
              </div>

              {/* Content */}
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {step.description}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
