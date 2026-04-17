'use client'

/**
 * NotificationPanel
 *
 * Bell icon button with dropdown showing pipeline notifications from the
 * last 24 hours. Each row has a remove button for manual dismissal.
 *
 * Notifications persist across page refreshes via the
 * `usePipelineNotificationsStore` (localStorage).
 */

import { Fragment, useCallback } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'
import { Link } from '@tanstack/react-router'
import { Loader2, CheckCircle, XCircle, ClipboardCheck, X } from 'lucide-react'
import { usePipelineNotificationsStore } from '@/lib/stores/pipeline-notifications-store'
import type { PipelineNotification, PipelineNotificationStatus } from '@/lib/stores/pipeline-notifications-store'

// ── Constants ─────────────────────────────────────────────────────────────────

const ONE_DAY_MS = 24 * 60 * 60 * 1_000

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: PipelineNotificationStatus }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
    case 'review':
      return <ClipboardCheck className="h-4 w-4 text-amber-400" />
    case 'complete':
      return <CheckCircle className="h-4 w-4 text-emerald-400" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />
  }
}

// ── Status label + colour ─────────────────────────────────────────────────────

function statusLabel(status: PipelineNotificationStatus): string {
  switch (status) {
    case 'running':  return 'In progress'
    case 'review':   return 'Ready for review'
    case 'complete': return 'Published'
    case 'failed':   return 'Failed'
  }
}

function statusTextClass(status: PipelineNotificationStatus): string {
  switch (status) {
    case 'running':  return 'text-violet-400'
    case 'review':   return 'text-amber-400'
    case 'complete': return 'text-emerald-400'
    case 'failed':   return 'text-red-400'
  }
}

// ── Time formatting ───────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ago`
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotificationRow({ notification }: { notification: PipelineNotification }) {
  const { markAsRead, removeNotification } = usePipelineNotificationsStore()

  const handleLinkClick = useCallback(() => {
    markAsRead(notification.id)
  }, [markAsRead, notification.id])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      removeNotification(notification.id)
    },
    [removeNotification, notification.id],
  )

  return (
    <MenuItem>
      {/* Wrapper div keeps the row interactive while also hosting the remove button */}
      <div className="group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800 data-focus:bg-zinc-800">
        {/* Clickable pipeline link area */}
        <Link
          to={notification.link as Parameters<typeof Link>[0]['to']}
          onClick={handleLinkClick}
          className="flex min-w-0 flex-1 items-start gap-3 outline-none"
        >
          {/* Status icon + unread dot */}
          <div className="relative mt-0.5 shrink-0">
            <StatusIcon status={notification.status} />
            {!notification.read && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-violet-500" />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-5">
            <p className="truncate text-sm font-medium text-zinc-200">
              {notification.type === 'article' ? 'Article' : 'Application'}
            </p>
            <p className="truncate text-xs text-zinc-400">{notification.label}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`text-[10px] font-medium ${statusTextClass(notification.status)}`}>
                {statusLabel(notification.status)}
              </span>
              <span className="text-[10px] text-zinc-600">·</span>
              <span className="text-[10px] text-zinc-600">
                {formatRelativeTime(notification.createdAt)}
              </span>
            </div>
          </div>
        </Link>

        {/* Remove button — appears on row hover */}
        <button
          type="button"
          onClick={handleRemove}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-zinc-300 group-hover:opacity-100"
          title="Remove notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </MenuItem>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationPanel() {
  const { notifications, markAllAsRead } = usePipelineNotificationsStore()

  // Only show notifications from the last 24 hours
  const recentNotifications = notifications.filter(
    (n) => Date.now() - n.createdAt <= ONE_DAY_MS,
  )

  const unreadCount = recentNotifications.filter((n) => !n.read).length

  return (
    <Menu as="div" className="relative">
      <MenuButton className="-m-2.5 p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors relative">
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-20 mt-2.5 w-80 origin-top-right rounded-xl bg-zinc-900 border border-zinc-700/50 py-1 shadow-xl shadow-black/20 focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
            <p className="text-sm font-semibold text-zinc-200">
              Pipeline Notifications
              {recentNotifications.length > 0 && (
                <span className="ml-2 text-xs font-normal text-zinc-500">last 24h</span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto py-1">
            {recentNotifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-600">
                No pipeline activity in the last 24 hours
              </p>
            ) : (
              recentNotifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))
            )}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  )
}
