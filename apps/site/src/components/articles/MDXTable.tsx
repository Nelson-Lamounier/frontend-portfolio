/**
 * MDX Table Components
 *
 * Custom styled table elements for S3-hosted Bedrock articles.
 * Provides a modern, colourful table design with:
 * - Teal gradient header row
 * - Alternating row stripes
 * - Rounded corners with shadow
 * - Hover highlight effect
 * - Dark mode support
 *
 * Registered in MDXRenderer as overrides for `table`, `thead`,
 * `tbody`, `tr`, `th`, and `td` elements.
 */

import clsx from 'clsx'

/**
 * Wrapper `<table>` — adds rounded corners, border, and shadow.
 */
export function Table({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="not-prose my-8 overflow-x-auto rounded-xl border border-zinc-200 shadow-md dark:border-zinc-700/60">
      <table
        className="w-full min-w-[480px] border-collapse text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

/**
 * `<thead>` — teal gradient background with bold white text.
 */
export function TableHead({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className="bg-gradient-to-r from-teal-600 to-teal-500 text-white dark:from-teal-700 dark:to-teal-600"
      {...props}
    >
      {children}
    </thead>
  )
}

/**
 * `<tbody>` — alternating row stripe container.
 */
export function TableBody({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'tbody'>) {
  return (
    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/40" {...props}>
      {children}
    </tbody>
  )
}

/**
 * `<tr>` — hover highlight and even-row stripe.
 */
export function TableRow({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className={clsx(
        'transition-colors',
        'even:bg-zinc-50 hover:bg-teal-50/40',
        'dark:even:bg-zinc-800/40 dark:hover:bg-teal-900/20',
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

/**
 * `<th>` — header cell with uppercase tracking and padding.
 */
export function TableHeaderCell({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
      {...props}
    >
      {children}
    </th>
  )
}

/**
 * `<td>` — body cell with consistent padding and text colour.
 */
export function TableCell({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      className="px-4 py-3 text-zinc-700 dark:text-zinc-300"
      {...props}
    >
      {children}
    </td>
  )
}
