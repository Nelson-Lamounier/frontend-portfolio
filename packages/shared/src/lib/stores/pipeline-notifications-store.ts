/**
 * Pipeline Notifications Store
 *
 * Persisted Zustand store for tracking active and completed pipeline
 * notifications across page navigations and refreshes.
 *
 * Stores notifications for both article generation pipelines and
 * application analysis pipelines, each with a link the user can follow
 * to monitor progress at any time.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

/** Pipeline types tracked by the notification system */
export type PipelineNotificationType = 'article' | 'application'

/** Status values for a tracked pipeline */
export type PipelineNotificationStatus = 'running' | 'review' | 'complete' | 'failed'

/** A single pipeline notification entry */
export interface PipelineNotification {
  /** Unique notification ID */
  readonly id: string
  /** Pipeline type — determines which polling strategy to use */
  readonly type: PipelineNotificationType
  /** Pipeline/article/application slug */
  readonly slug: string
  /** Human-readable label (article slug, or "Company — Role") */
  readonly label: string
  /** Current pipeline status */
  status: PipelineNotificationStatus
  /** Deep link to the monitoring page */
  readonly link: string
  /** Unix timestamp (ms) when the pipeline was started */
  readonly createdAt: number
  /** Unix timestamp (ms) when the pipeline reached a terminal state */
  completedAt?: number
  /** Whether the user has read/acknowledged this notification */
  read: boolean
}

// =============================================================================
// Store interface
// =============================================================================

interface PipelineNotificationsState {
  notifications: PipelineNotification[]
}

interface PipelineNotificationsActions {
  /**
   * Adds a new pipeline notification (duplicate slugs are ignored).
   */
  addNotification: (notification: Omit<PipelineNotification, 'id' | 'createdAt' | 'read'>) => void

  /**
   * Updates the status (and optionally completedAt) of an existing notification.
   */
  updateNotification: (slug: string, status: PipelineNotificationStatus) => void

  /** Marks a single notification as read. */
  markAsRead: (id: string) => void

  /** Marks all notifications as read. */
  markAllAsRead: () => void

  /** Removes a single notification by ID. */
  removeNotification: (id: string) => void

  /** Removes all completed/failed notifications. */
  clearCompleted: () => void
}

// =============================================================================
// Store
// =============================================================================

/**
 * Persisted pipeline notification store.
 *
 * Uses localStorage so notifications survive page refresh and navigation.
 *
 * @example
 * ```typescript
 * const { addNotification } = usePipelineNotificationsStore()
 * addNotification({
 *   type: 'article',
 *   slug: 'my-article',
 *   label: 'my-article',
 *   status: 'running',
 *   link: '/ai-agent?mode=pipeline&slug=my-article',
 * })
 * ```
 */
export const usePipelineNotificationsStore = create<
  PipelineNotificationsState & PipelineNotificationsActions
>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (notification) => {
        set((state) => {
          // Prevent duplicate entries for the same slug
          const exists = state.notifications.some((n) => n.slug === notification.slug)
          if (exists) {
            // Re-activate if previously completed
            return {
              notifications: state.notifications.map((n) =>
                n.slug === notification.slug
                  ? { ...n, status: notification.status, completedAt: undefined, read: false }
                  : n,
              ),
            }
          }

          const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const newNotification: PipelineNotification = {
            ...notification,
            id,
            createdAt: Date.now(),
            read: false,
          }
          return { notifications: [newNotification, ...state.notifications] }
        })
      },

      updateNotification: (slug, status) => {
        set((state) => ({
          notifications: state.notifications.map((n) => {
            if (n.slug !== slug) return n
            const isTerminal = status === 'complete' || status === 'failed' || status === 'review'
            return {
              ...n,
              status,
              completedAt: isTerminal && !n.completedAt ? Date.now() : n.completedAt,
            }
          }),
        }))
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }))
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      clearCompleted: () => {
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => n.status === 'running',
          ),
        }))
      },
    }),
    {
      name: 'pipeline-notifications',
    },
  ),
)
