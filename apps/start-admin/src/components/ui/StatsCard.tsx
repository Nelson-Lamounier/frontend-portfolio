import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid'

export interface StatItem {
  name: string
  stat: string | number
  previousStat?: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'none'
  icon?: React.ComponentType<{ className?: string }>
}

interface StatsCardProps {
  readonly title?: string
  readonly stats: StatItem[]
}

function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function StatsCard({ title, stats }: StatsCardProps) {
  let gridColsClass = 'md:grid-cols-3'
  if (stats.length === 2) {
    gridColsClass = 'md:grid-cols-2'
  } else if (stats.length === 4) {
    gridColsClass = 'lg:grid-cols-4 md:grid-cols-2'
  }

  return (
    <div>
      {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
      <dl className={`mt-5 grid grid-cols-1 ${gridColsClass} divide-white/10 overflow-hidden rounded-lg bg-zinc-800/40 border border-zinc-700/50 shadow-sm max-md:divide-y md:divide-x`}>
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.name} className="px-4 py-5 sm:p-6 flex flex-col justify-between">
              <dt className="text-base font-normal text-zinc-400 flex items-center gap-2">
                {Icon && <Icon className="size-4 text-zinc-400" />}
                {item.name}
              </dt>
              <dd className="mt-2 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-baseline text-2xl font-semibold text-white">
                  {item.stat}
                  {item.previousStat && (
                    <span className="ml-2 text-sm font-medium text-zinc-500">from {item.previousStat}</span>
                  )}
                </div>

                {item.change && item.changeType && item.changeType !== 'none' && (
                  <div
                    className={classNames(
                      item.changeType === 'increase' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-500',
                      'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0',
                    )}
                  >
                    {item.changeType === 'increase' ? (
                      <ArrowUpIcon aria-hidden="true" className="mr-0.5 -ml-1 size-5 shrink-0 self-center text-emerald-400" />
                    ) : (
                      <ArrowDownIcon aria-hidden="true" className="mr-0.5 -ml-1 size-5 shrink-0 self-center text-red-500" />
                    )}

                    <span className="sr-only"> {item.changeType === 'increase' ? 'Increased' : 'Decreased'} by </span>
                    {item.change}
                  </div>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
