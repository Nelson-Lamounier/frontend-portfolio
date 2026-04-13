import type { ReactNode } from 'react'

export interface LinkCardProps {
  title: ReactNode
  subtitle: ReactNode
  icon?: ReactNode
  onClick?: () => void
  topRight?: ReactNode
  bottom?: ReactNode
}

export function LinkCard({ title, subtitle, icon, onClick, topRight, bottom }: LinkCardProps) {
  return (
    <div className="group relative flex flex-col justify-between rounded-lg border border-white/10 bg-zinc-800/50 px-6 py-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-500 hover:border-white/25 transition-colors">
      <div className="flex items-center space-x-4">
        {icon && (
          <div className="shrink-0 flex size-10 items-center justify-center rounded-full bg-zinc-700 outline -outline-offset-1 outline-white/10">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {onClick ? (
            <button onClick={onClick} className="focus:outline-none text-left w-full block">
              <span aria-hidden="true" className="absolute inset-0" />
              <div className="text-sm font-medium text-white">{title}</div>
              <div className="truncate text-sm text-zinc-400 mt-1">{subtitle}</div>
            </button>
          ) : (
            <div>
              <div className="text-sm font-medium text-white">{title}</div>
              <div className="truncate text-sm text-zinc-400 mt-1">{subtitle}</div>
            </div>
          )}
        </div>
        {topRight && (
          <div className="relative z-10 shrink-0">
            {topRight}
          </div>
        )}
      </div>
      
      {bottom && (
        <div className="relative z-10 mt-4 border-t border-white/5 pt-4">
          {bottom}
        </div>
      )}
    </div>
  )
}

