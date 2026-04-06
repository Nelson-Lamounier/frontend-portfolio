function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export type Stat = {
  name: string
  value: string | number
  change?: string
  changeType?: string
}

export type StatsProps = Readonly<{
  stats: readonly Stat[]
}>

export function Stats({ stats }: StatsProps) {
  const gridColsLg = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }[stats.length] || 'lg:grid-cols-4'

  return (
    <div className="border-b border-b-white/10 lg:border-t lg:border-t-white/5">
      <dl className={classNames("mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-2 lg:px-2 xl:px-0", gridColsLg)}>
        {stats.map((stat, statIdx) => {
          let borderClass = '';
          if (statIdx % 2 === 1) {
            borderClass = 'sm:border-l';
          }
          if (statIdx > 0) {
            borderClass = classNames(borderClass, 'lg:border-l');
          }
          
          return (
            <div
              key={stat.name}
              className={classNames(
                borderClass,
                'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-white/5 px-4 py-10 sm:px-6 lg:border-t-0 xl:px-8',
              )}
            >
            <dt className="text-sm/6 font-medium text-gray-400 w-full">{stat.name}</dt>
            <dd className="w-full flex-none text-3xl/10 font-medium tracking-tight text-white">{stat.value}</dd>
            {stat.change && (
              <dd
                className={classNames(
                  stat.changeType === 'negative' ? 'text-rose-400' : stat.changeType === 'positive' ? 'text-green-400' : 'text-gray-400',
                  'text-xs font-medium w-full',
                )}
              >
                {stat.change}
              </dd>
            )}
          </div>
        )})}
      </dl>
    </div>
  )
}
