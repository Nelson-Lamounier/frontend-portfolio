'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import React from 'react'

export interface DashboardDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title: React.ReactNode
  readonly description?: React.ReactNode
  readonly children: React.ReactNode
  readonly actions?: React.ReactNode
  readonly unstyledContent?: boolean
}

export function DashboardDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  unstyledContent = false,
}: DashboardDrawerProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-30">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {/* On lg screens: width is 100vw minus sidebar (18rem). On all screens: top-16 clears the 64px header nav */}
          <div className="pointer-events-none fixed top-16 bottom-0 right-0 flex w-full lg:w-[calc(100vw-18rem)]">
            <DialogPanel
              transition
              className="pointer-events-auto w-full transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700"
            >
              <div className="flex h-full flex-col overflow-y-auto bg-gray-900 shadow-2xl py-6 lg:border-l lg:border-white/10">
                {/* Header */}
                <div className="px-4 sm:px-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-lg font-semibold text-white">
                        {title}
                      </DialogTitle>
                      {description && (
                        <p className="mt-1 text-sm text-gray-400">{description}</p>
                      )}
                    </div>
                    <div className="ml-3 flex h-7 items-center gap-4">
                      {actions}
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon aria-hidden="true" className="size-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="relative mt-6 flex-1 px-4 sm:px-6 overflow-hidden">
                  {unstyledContent ? (
                    children
                  ) : (
                    <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
                      {children}
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
