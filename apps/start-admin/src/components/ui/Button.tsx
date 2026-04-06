import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { PlusIcon, TrashIcon } from '@heroicons/react/20/solid'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'danger-lg'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

// Utility to combine classes safely
function cx(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Button({
  children,
  variant = 'primary',
  size: _size = 'md', // Retaining size prop for API compatibility, though we lean on variants for sizing now
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  
  // Base structural classes
  const baseClasses = 'inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed transition-colors disabled:opacity-50'
  
  // Visual variants directly matching the exact commented styles requested
  const variantClasses = {
    primary:
      'px-3 py-1 text-xs font-medium text-blue-400 border border-blue-400/30 bg-blue-400/10 rounded hover:bg-blue-400/20',
    secondary:
      'px-3 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-500',
    danger:
      'px-3 py-1 text-xs font-medium text-red-400 border border-red-400/30 bg-red-400/10 rounded hover:bg-red-400/20',
    'danger-lg':
      'px-6 py-2 text-xs font-medium text-red-400 border border-red-400/30 bg-red-400/10 rounded hover:bg-red-400/20',
    warning:
      'px-3 py-1 text-xs font-medium text-amber-500 border border-amber-500/30 bg-amber-500/10 rounded hover:bg-amber-500/20',
    ghost:
      'px-3 py-1 text-xs font-medium text-gray-300 border border-white/10 rounded hover:bg-white/5',
  }

  return (
    <button
      type="button"
      className={cx(
        baseClasses,
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function AddButton({ onClick, children }: { onClick: () => void, children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <Button variant="ghost" type="button" onClick={onClick} className="border-dashed border-white/20">
        <PlusIcon className="-ml-0.5 mr-1.5 size-4" aria-hidden="true" />
        {children}
      </Button>
    </div>
  )
}

export function RemoveButton({ onClick, title = "Remove item" }: { onClick: () => void, title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-white/5 p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-colors"
      title={title}
    >
      <TrashIcon className="size-4" aria-hidden="true" />
    </button>
  )
}

export function AddSubItemButton({ onClick, children }: { onClick: () => void, children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 text-sm font-medium text-indigo-400 hover:text-indigo-300">
      + {children}
    </button>
  )
}

export function RemoveSubItemButton({ onClick, title = "Remove item" }: { onClick: () => void, title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 text-gray-500 hover:text-red-400 transition-colors"
      title={title}
    >
      <TrashIcon className="size-4" aria-hidden="true" />
    </button>
  )
}


export function HeaderLink({
  href,
  to,
  target,
  rel,
  children,
}: {
  href?: string
  to?: string
  target?: string
  rel?: string
  children: ReactNode
}) {
  const className =
    'inline-flex items-center justify-center flex-shrink-0 whitespace-nowrap h-[34px] rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'

  if (to) {
    return (
      <Link to={to as any} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} target={target} rel={rel} className={className}>
      {children}
    </a>
  )
}
