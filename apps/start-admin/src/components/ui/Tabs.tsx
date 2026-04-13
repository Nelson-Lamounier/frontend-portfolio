import { ChevronDownIcon } from '@heroicons/react/16/solid'
import type { TabItem } from '../../types'

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

interface TabsProps {
  readonly tabs: TabItem[]
  readonly onTabChange?: (tabName: string) => void
}

export function Tabs({ tabs, onTabChange }: TabsProps) {
  const currentTab = tabs.find((tab) => tab.current) || tabs[0]

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700/50 pb-5 sm:pb-0">
      <div className="mt-3 sm:mt-4">
        {/* Mobile select */}
        <div className="grid grid-cols-1 sm:hidden">
          <select
            defaultValue={currentTab?.name}
            onChange={(e) => onTabChange?.(e.target.value)}
            aria-label="Select a tab"
            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white dark:bg-zinc-800 py-2 pr-8 pl-3 text-base text-zinc-900 dark:text-zinc-100 outline-1 -outline-offset-1 outline-zinc-300 dark:outline-zinc-700 *:bg-white dark:*:bg-zinc-800 focus:outline-2 focus:-outline-offset-2 focus:outline-teal-500"
          >
            {tabs.map((tab) => (
              <option key={tab.name} value={tab.name}>
                {tab.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-zinc-400"
          />
        </div>

        {/* Desktop tab buttons */}
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => onTabChange?.(tab.name)}
                aria-current={tab.current ? 'page' : undefined}
                className={classNames(
                  tab.current
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300',
                  'border-b-2 pb-3 text-sm font-medium whitespace-nowrap cursor-pointer flex items-center transition-colors',
                )}
              >
                {tab.name}
                {tab.count !== undefined && (
                  <span
                    className={classNames(
                      tab.current
                        ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400'
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-500',
                      'ml-3 hidden rounded-full px-2.5 py-0.5 text-xs font-medium md:inline-block',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
