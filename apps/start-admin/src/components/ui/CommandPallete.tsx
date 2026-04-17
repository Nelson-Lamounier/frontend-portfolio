'use client'

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogPanel,
  DialogBackdrop,
} from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export type CommandPalleteItem = {
  id: string
  name: string
  description?: string
  icon?: React.ElementType
  color?: string
}

interface CommandPalleteProps {
  open: boolean
  setOpen: (open: boolean) => void
  items: CommandPalleteItem[]
  onSelect: (item: CommandPalleteItem) => void
  placeholder?: string
}

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function CommandPallete({ open, setOpen, items, onSelect, placeholder = 'Search...' }: CommandPalleteProps) {
  const [query, setQuery] = useState('')

  const filteredItems =
    query === ''
      ? items
      : items.filter((item) => {
          return item.name.toLowerCase().includes(query.toLowerCase()) || 
                 item.description?.toLowerCase().includes(query.toLowerCase())
        })

  return (
    <Dialog
      className="relative z-50"
      open={open}
      onClose={() => {
        setOpen(false)
        setQuery('')
      }}
    >
      {/* Backdrop */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-900/40 dark:bg-zinc-900/60 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel
          transition
          className="mx-auto max-w-2xl transform divide-y divide-zinc-200 dark:divide-white/10 overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-zinc-200 dark:ring-white/5 transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        >
          <Combobox
            as="div"
            onChange={(item: CommandPalleteItem | null) => {
              if (item) {
                onSelect(item)
                setOpen(false)
                setQuery('')
              }
            }}
          >
            <div className="grid grid-cols-1">
              <ComboboxInput
                autoFocus
                className="col-start-1 row-start-1 h-16 w-full bg-transparent pr-4 pl-11 text-base text-zinc-900 dark:text-white outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 sm:text-sm"
                placeholder={placeholder}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => setQuery('')}
              />
              <MagnifyingGlassIcon
                className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-zinc-400"
                aria-hidden="true"
              />
            </div>

            {filteredItems.length > 0 && (
              <ComboboxOptions static className="max-h-96 transform-gpu scroll-py-3 overflow-y-auto p-3">
                {filteredItems.map((item) => (
                  <ComboboxOption
                    key={item.id}
                    value={item}
                    className="group flex cursor-pointer rounded-xl p-3 select-none data-focus:bg-zinc-100 dark:data-focus:bg-white/5 data-focus:outline-none"
                  >
                    {item.icon && (
                      <div
                        className={classNames(
                          'flex size-10 flex-none items-center justify-center rounded-lg',
                          item.color || 'bg-teal-500',
                        )}
                      >
                        <item.icon className="size-6 text-white" aria-hidden="true" />
                      </div>
                    )}
                    <div className={classNames('flex-auto', item.icon ? 'ml-4' : '')}>
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-data-focus:text-zinc-900 dark:group-data-focus:text-white">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 group-data-focus:text-zinc-600 dark:group-data-focus:text-zinc-300">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            )}

            {query !== '' && filteredItems.length === 0 && (
              <div className="px-6 py-14 text-center text-sm sm:px-14">
                <ExclamationCircleIcon
                  className="mx-auto size-6 text-zinc-400"
                  aria-hidden="true"
                />
                <p className="mt-4 font-semibold text-zinc-900 dark:text-white">No results found</p>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">We couldn't find anything with that term. Please try again.</p>
              </div>
            )}
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
