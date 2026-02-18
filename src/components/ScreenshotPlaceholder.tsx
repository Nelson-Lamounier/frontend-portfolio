interface ScreenshotPlaceholderProps {
  alt: string
  type?: 'screenshot' | 'terminal'
}

export function ScreenshotPlaceholder({
  alt,
  type = 'screenshot',
}: ScreenshotPlaceholderProps) {
  const isTerminal = type === 'terminal'

  return (
    <figure className="my-8">
      <div
        className={`flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed p-6 ${
          isTerminal
            ? 'border-emerald-300 bg-zinc-900 dark:border-emerald-700'
            : 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50'
        }`}
      >
        <div className="text-center">
          {isTerminal ? (
            <svg
              className="mx-auto mb-3 h-10 w-10 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          ) : (
            <svg
              className="mx-auto mb-3 h-10 w-10 text-zinc-400 dark:text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 19.5V4.5a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          )}
          <p
            className={`max-w-sm text-sm font-medium ${
              isTerminal
                ? 'text-emerald-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {alt}
          </p>
          <p
            className={`mt-1 text-xs ${
              isTerminal
                ? 'text-emerald-600 dark:text-emerald-700'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {isTerminal ? 'Terminal recording' : 'Real screenshot'} — to be
            captured via SSM session
          </p>
        </div>
      </div>
    </figure>
  )
}
