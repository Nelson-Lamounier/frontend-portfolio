import type { ReactNode } from 'react'

interface DashboardPageProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly actions?: ReactNode
  readonly headerBottom?: ReactNode
  readonly fullWidth?: boolean
  readonly children: ReactNode
}

export function DashboardPage({
  title,
  description,
  actions,
  headerBottom,
  fullWidth: _fullWidth = false,
  children,
}: DashboardPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-gray-400">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="mt-4 flex sm:ml-4 sm:mt-0 items-center justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
      {headerBottom && (
        <div className="w-full">
          {headerBottom}
        </div>
      )}
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}

