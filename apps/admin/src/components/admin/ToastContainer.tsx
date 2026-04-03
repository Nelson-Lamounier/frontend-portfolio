/**
 * Toast Container Component
 *
 * Renders global toast notifications from the Zustand toast store.
 * Positioned in the top-right corner with smooth enter/exit animations.
 *
 * @example
 * ```tsx
 * // Include once in the admin layout
 * <ToastContainer />
 * ```
 */

'use client'

import { useToastStore } from '@/lib/stores/toast-store'
import type { ToastType } from '@/lib/stores/toast-store'

// =============================================================================
// STYLE MAPPINGS
// =============================================================================

/** Toast colour and icon mappings by severity */
const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-800 dark:text-teal-200',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: '✗',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'ℹ',
  },
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Global toast notification renderer.
 * Reads from the Zustand toast store and renders notifications.
 *
 * @returns Toast container JSX (or null if no toasts)
 */
export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type]

        return (
          <div
            key={toast.id}
            className={`flex min-w-[320px] max-w-[420px] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-right ${style.bg} ${style.border}`}
            role="alert"
          >
            {/* Icon */}
            <span className={`mt-0.5 flex-shrink-0 text-sm font-bold ${style.text}`}>
              {style.icon}
            </span>

            {/* Message */}
            <p className={`flex-1 text-sm font-medium ${style.text}`}>
              {toast.message}
            </p>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className={`flex-shrink-0 text-sm opacity-60 transition-opacity hover:opacity-100 ${style.text}`}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
