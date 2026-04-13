import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { Bars3Icon, BellIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { Fragment } from 'react'
import { useTheme } from '../../hooks/useTheme'

/**
 * Props for the {@link HeaderNav} component.
 */
interface HeaderNavProps {
  /** Callback fired when the mobile sidebar open button is pressed. */
  onOpenSidebar: () => void
  /** Callback fired when the user triggers sign-out. */
  onSignOut?: () => void
  /** URL of the user's avatar image. Falls back to a placeholder if omitted. */
  userAvatar?: string
  /** Email address displayed in the profile dropdown. */
  userEmail?: string
}

/**
 * Top navigation bar for the admin shell.
 *
 * Renders a sticky header with:
 * - Mobile sidebar toggle (hidden on `lg+`)
 * - Functional light/dark mode toggle wired to `useTheme`
 * - Bell notification button (placeholder)
 * - Profile dropdown with sign-out
 *
 * All colours use semantic Zinc/Teal tokens with full dark-mode variants.
 *
 * @param props - {@link HeaderNavProps}
 */
export function HeaderNav({ onOpenSidebar, onSignOut, userAvatar, userEmail }: HeaderNavProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-zinc-500 dark:text-zinc-400 lg:hidden"
        onClick={onOpenSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile separator */}
      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700/50 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="-m-2.5 p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="sr-only">{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
            {theme === 'dark' ? (
              <SunIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Desktop separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-zinc-200 dark:lg:bg-zinc-700/50" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <MenuButton className="-m-1.5 flex items-center p-1.5 focus:outline-none">
              <span className="sr-only">Open user menu</span>
              <img
                className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                src={
                  userAvatar ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                }
                alt="Admin avatar"
              />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100" aria-hidden="true">
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
              <MenuItems className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-lg bg-white dark:bg-zinc-800 py-2 shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-700/50 focus:outline-none">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700/50 mb-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {userEmail || 'admin@nelsonlamounier.com'}
                  </p>
                </div>
                <MenuItem>
                  <a
                    href="#"
                    className="block px-3 py-1.5 text-sm leading-6 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 data-focus:bg-zinc-50 dark:data-focus:bg-zinc-700/50 outline-none transition-colors"
                  >
                    Your profile
                  </a>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={onSignOut}
                    className="block w-full text-left px-3 py-1.5 text-sm leading-6 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 data-focus:bg-zinc-50 dark:data-focus:bg-zinc-700/50 outline-none transition-colors"
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
