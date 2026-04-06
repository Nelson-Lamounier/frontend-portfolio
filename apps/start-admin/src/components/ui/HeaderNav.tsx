import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { Bars3Icon, BellIcon, MoonIcon } from '@heroicons/react/24/outline'
import { Fragment } from 'react'



interface HeaderNavProps {
  onOpenSidebar: () => void
  onSignOut?: () => void
  userAvatar?: string
  userEmail?: string
}

export function HeaderNav({ onOpenSidebar, onSignOut, userAvatar, userEmail }: HeaderNavProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-gray-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button type="button" className="-m-2.5 p-2.5 text-gray-400 lg:hidden" onClick={onOpenSidebar}>
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-white/10 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-300 transition-colors" title="Toggle dark mode">
            <span className="sr-only">Toggle theme</span>
            <MoonIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-300 transition-colors">
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-white/10" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <MenuButton className="-m-1.5 flex items-center p-1.5 focus:outline-none">
              <span className="sr-only">Open user menu</span>
              <img
                className="h-8 w-8 rounded-full bg-gray-800 object-cover"
                src={userAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                alt=""
              />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-white" aria-hidden="true">
                  Admin User
                </span>
              </span>
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
              <MenuItems className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-gray-800 py-2 shadow-lg ring-1 ring-white/10 focus:outline-none">
                <div className="px-3 py-2 border-b border-white/10 mb-2">
                  <p className="text-xs text-gray-400 truncate">{userEmail || 'admin@nelsonlamounier.com'}</p>
                </div>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-3 py-1 text-sm leading-6 text-white data-focus:bg-white/5 outline-none"
                  >
                    Your profile
                  </a>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={onSignOut}
                    className="block w-full text-left px-3 py-1 text-sm leading-6 text-white data-focus:bg-white/5 outline-none"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  )
}
