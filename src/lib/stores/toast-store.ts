/**
 * Toast Zustand Store
 *
 * Global toast notification system for the admin dashboard.
 * Renders non-blocking notifications for mutation results,
 * API errors, and user feedback.
 *
 * Toasts auto-dismiss after a configurable duration.
 */

import { create } from 'zustand'

// =============================================================================
// TYPES
// =============================================================================

/** Toast severity levels */
export type ToastType = 'success' | 'error' | 'info' | 'warning'

/** Individual toast notification */
export interface Toast {
  readonly id: string
  readonly type: ToastType
  readonly message: string
  readonly duration: number
}

/** Toast store state */
interface ToastState {
  /** Active toast notifications */
  toasts: Toast[]
}

/** Toast store actions */
interface ToastActions {
  /**
   * Adds a toast notification.
   *
   * @param type - Severity level
   * @param message - Display message
   * @param duration - Auto-dismiss time in milliseconds (default: 4000)
   */
  addToast: (type: ToastType, message: string, duration?: number) => void

  /** Removes a toast by ID */
  removeToast: (id: string) => void

  /** Clears all toasts */
  clearToasts: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default toast display duration (milliseconds) */
const DEFAULT_TOAST_DURATION_MS = 4_000

// =============================================================================
// STORE
// =============================================================================

/**
 * Global toast notification store.
 *
 * @example
 * ```typescript
 * const { addToast } = useToastStore()
 * addToast('success', 'Article published successfully!')
 * addToast('error', 'Failed to save changes', 6000)
 * ```
 */

/**
 * Creates the toast store state and actions.
 * Extracted to module-level to reduce function nesting depth.
 *
 * @param set - Zustand set function
 * @returns Initial state and action handlers
 */
function createToastSlice(
  set: (fn: (state: ToastState) => Partial<ToastState>) => void,
): ToastState & ToastActions {
  return {
    toasts: [],

    addToast: (type, message, duration = DEFAULT_TOAST_DURATION_MS) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const toast: Toast = { id, type, message, duration }

      set((state) => ({ toasts: [...state.toasts, toast] }))

      // Auto-dismiss after the configured duration
      globalThis.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    },

    removeToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    },

    clearToasts: () => set(() => ({ toasts: [] })),
  }
}

export const useToastStore = create<ToastState & ToastActions>()(createToastSlice)
