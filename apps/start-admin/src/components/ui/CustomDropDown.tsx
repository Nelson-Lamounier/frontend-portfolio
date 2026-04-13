'use client'

import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { CheckIcon } from '@heroicons/react/20/solid'

export type DropdownOption = {
  value: string
  label: string
}

interface CustomDropDownProps {
  label?: string
  options: readonly DropdownOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CustomDropDown({ label, options, value, onChange, disabled }: CustomDropDownProps) {
  const selected = options.find((opt) => opt.value === value) || options[0]

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled} as="div">
      {label && (
        <Label className="block text-sm/6 font-medium text-zinc-700 dark:text-white mb-2">
          {label}
        </Label>
      )}
      <div className="relative">
        {/* Trigger button */}
        <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-zinc-100 dark:bg-white/5 py-1.5 pr-2 pl-3 text-left text-zinc-900 dark:text-white outline-1 -outline-offset-1 outline-zinc-300 dark:outline-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-500 sm:text-sm/6 transition-colors hover:bg-zinc-200 dark:hover:bg-white/10">
          <span className="col-start-1 row-start-1 truncate pr-6">{selected?.label}</span>
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end text-zinc-400 sm:size-4"
          />
        </ListboxButton>

        {/* Dropdown panel */}
        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-60 w-full min-w-max overflow-auto rounded-md bg-white dark:bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-zinc-200 dark:ring-white/10 data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="group relative cursor-default py-2 pr-4 pl-8 text-zinc-900 dark:text-white select-none data-focus:bg-teal-500 data-focus:text-white data-focus:outline-hidden"
            >
              <span className="block truncate font-normal group-data-selected:font-semibold">
                {option.label}
              </span>

              <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-teal-600 dark:text-teal-400 group-not-data-selected:hidden group-data-focus:text-white">
                <CheckIcon aria-hidden="true" className="size-5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
