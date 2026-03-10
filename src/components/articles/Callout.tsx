import { type ReactNode } from 'react'

type CalloutVariant = 'info' | 'warning' | 'security' | 'insight'

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  children: ReactNode
}

const variantConfig = {
  info: {
    borderColor: 'border-l-teal-500',
    bg: 'bg-teal-50/50 dark:bg-teal-950/20',
    border: 'border-teal-100 dark:border-teal-900/40',
    iconColor: 'text-teal-500 dark:text-teal-400',
    titleColor: 'text-teal-800 dark:text-teal-300',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
    defaultTitle: 'Note',
  },
  warning: {
    borderColor: 'border-l-amber-500',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    border: 'border-amber-100 dark:border-amber-900/40',
    iconColor: 'text-amber-500 dark:text-amber-400',
    titleColor: 'text-amber-800 dark:text-amber-300',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    defaultTitle: 'Warning',
  },
  security: {
    borderColor: 'border-l-violet-500',
    bg: 'bg-violet-50/50 dark:bg-violet-950/20',
    border: 'border-violet-100 dark:border-violet-900/40',
    iconColor: 'text-violet-500 dark:text-violet-400',
    titleColor: 'text-violet-800 dark:text-violet-300',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    defaultTitle: 'Security',
  },
  insight: {
    borderColor: 'border-l-indigo-500',
    bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    border: 'border-indigo-100 dark:border-indigo-900/40',
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    titleColor: 'text-indigo-800 dark:text-indigo-300',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    defaultTitle: 'Insight',
  },
} as const

export function Callout({ variant = 'info', title, children }: CalloutProps) {
  const config = variantConfig[variant]
  const displayTitle = title ?? config.defaultTitle

  return (
    <div
      className={`my-8 rounded-xl border-l-[3px] border ${config.borderColor} ${config.border} ${config.bg} px-5 py-4`}
    >
      <div className="flex items-center gap-2.5">
        <span className={config.iconColor}>{config.icon}</span>
        <span className={`text-sm font-semibold ${config.titleColor}`}>
          {displayTitle}
        </span>
      </div>
      <div className="mt-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 [&>p]:my-2 [&>ol]:my-2 [&>ol]:pl-4 [&>ol]:list-decimal [&>ul]:my-2 [&>ul]:pl-4 [&>ul]:list-disc">
        {children}
      </div>
    </div>
  )
}
