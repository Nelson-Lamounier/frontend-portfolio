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
      {label && <Label className="block text-sm/6 font-medium text-white mb-2">{label}</Label>}
      <div className="relative">
        <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-white/5 py-1.5 pr-2 pl-3 text-left text-white outline-1 -outline-offset-1 outline-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:text-sm/6">
          <span className="col-start-1 row-start-1 truncate pr-6">{selected?.label}</span>
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end text-zinc-400 sm:size-4"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-60 w-full min-w-max overflow-auto rounded-md bg-zinc-800 py-1 text-base outline-1 -outline-offset-1 outline-white/10 data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="group relative cursor-default py-2 pr-4 pl-8 text-white select-none data-focus:bg-indigo-500 data-focus:outline-hidden"
            >
              <span className="block truncate font-normal group-data-selected:font-semibold">{option.label}</span>

              <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-indigo-400 group-not-data-selected:hidden group-data-focus:text-white">
                <CheckIcon aria-hidden="true" className="size-5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}

