import type { ReactNode } from 'react'
import { Tabs } from './Tabs'
import type { TabItem } from '../../types'

export interface TabbedContainerProps {
  title: ReactNode
  tabs: TabItem[]
  onTabChange: (tabName: string) => void
  children: ReactNode
}

export function TabbedContainer({ title, tabs, onTabChange, children }: TabbedContainerProps) {
  return (
    <div className="flex flex-col">
      {title && (
        <div className="mb-4">
          {typeof title === 'string' ? (
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          ) : (
            title
          )}
        </div>
      )}
      <div className="mb-6">
        <Tabs tabs={tabs} onTabChange={onTabChange} />
      </div>
      <div className="pb-16">
        {children}
      </div>
    </div>
  )
}
