import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, EllipsisHorizontalIcon } from '@heroicons/react/20/solid'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Link } from '@tanstack/react-router'

export default function Example() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-none items-center justify-between border-b border-white/15 bg-gray-800/50 px-6 py-4">
        <h1 className="text-base font-semibold text-white">
          <time dateTime="2022-01">January 2022</time>
        </h1>
        <div className="flex items-center">
          <div className="relative flex items-center rounded-md bg-white/10 outline -outline-offset-1 outline-white/5 md:items-stretch">
            <button
              type="button"
              className="flex h-9 w-12 items-center justify-center rounded-l-md pr-1 text-gray-400 hover:text-white focus:relative md:w-9 md:pr-0 md:hover:bg-white/10"
            >
              <span className="sr-only">Previous week</span>
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              className="hidden px-3.5 text-sm font-semibold text-white hover:bg-white/10 focus:relative md:block"
            >
              Today
            </button>
            <span className="relative -mx-px h-5 w-px bg-white/10 md:hidden" />
            <button
              type="button"
              className="flex h-9 w-12 items-center justify-center rounded-r-md pl-1 text-gray-400 hover:text-white focus:relative md:w-9 md:pl-0 md:hover:bg-white/10"
            >
              <span className="sr-only">Next week</span>
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="hidden md:ml-4 md:flex md:items-center">
            <Menu as="div" className="relative">
              <MenuButton
                type="button"
                className="flex items-center gap-x-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white inset-ring inset-ring-white/5 hover:bg-white/20"
              >
                Week view
                <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-gray-500" />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-3 w-36 origin-top-right overflow-hidden rounded-md bg-gray-800 shadow-lg outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <div className="py-1">
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'day' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Day view
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'week' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Week view
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'month' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Month view
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'year' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Year view
                    </Link>
                  </MenuItem>
                </div>
              </MenuItems>
            </Menu>
            <div className="ml-6 h-6 w-px bg-white/10" />
            <button
              type="button"
              className="ml-6 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Add event
            </button>
          </div>
          <div className="ml-6 md:hidden">
            <Menu as="div" className="relative">
              <MenuButton className="relative flex items-center rounded-full text-gray-400 outline-offset-8 hover:text-white">
                <span className="absolute -inset-2" />
                <span className="sr-only">Open menu</span>
                <EllipsisHorizontalIcon aria-hidden="true" className="size-5" />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-3 w-36 origin-top-right divide-y divide-white/10 overflow-hidden rounded-md bg-gray-800 shadow-lg outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <div className="py-1">
                  <MenuItem>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Create event
                    </a>
                  </MenuItem>
                </div>
                <div className="py-1">
                  <MenuItem>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Go to today
                    </a>
                  </MenuItem>
                </div>
                <div className="py-1">
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'day' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Day view
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'week' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Week view
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'month' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Month view
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      to="/calendar"
                      search={{ view: 'year' }}
                      className="block px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                    >
                      Year view
                    </Link>
                  </MenuItem>
                </div>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </header>
      <div className="isolate flex flex-auto flex-col overflow-auto bg-gray-900">
        <div style={{ width: '165%' }} className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
          <div className="sticky top-0 z-30 flex-none bg-gray-900 ring-1 ring-white/20 sm:pr-8">
            <div className="grid grid-cols-7 text-sm/6 text-gray-400 sm:hidden">
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                M <span className="mt-1 flex size-8 items-center justify-center font-semibold text-white">10</span>
              </button>
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                T <span className="mt-1 flex size-8 items-center justify-center font-semibold text-white">11</span>
              </button>
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                W{' '}
                <span className="mt-1 flex size-8 items-center justify-center rounded-full bg-indigo-500 font-semibold text-white">
                  12
                </span>
              </button>
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                T <span className="mt-1 flex size-8 items-center justify-center font-semibold text-white">13</span>
              </button>
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                F <span className="mt-1 flex size-8 items-center justify-center font-semibold text-white">14</span>
              </button>
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                S <span className="mt-1 flex size-8 items-center justify-center font-semibold text-white">15</span>
              </button>
              <button type="button" className="flex flex-col items-center pt-2 pb-3">
                S <span className="mt-1 flex size-8 items-center justify-center font-semibold text-white">16</span>
              </button>
            </div>

            <div className="-mr-px hidden grid-cols-7 divide-x divide-white/10 border-r border-white/10 text-sm/6 text-gray-400 sm:grid">
              <div className="col-end-1 w-14" />
              <div className="flex items-center justify-center py-3">
                <span>
                  Mon <span className="items-center justify-center font-semibold text-white">10</span>
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <span>
                  Tue <span className="items-center justify-center font-semibold text-white">11</span>
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <span className="flex items-baseline">
                  Wed{' '}
                  <span className="ml-1.5 flex size-8 items-center justify-center rounded-full bg-indigo-500 font-semibold text-white">
                    12
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <span>
                  Thu <span className="items-center justify-center font-semibold text-white">13</span>
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <span>
                  Fri <span className="items-center justify-center font-semibold text-white">14</span>
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <span>
                  Sat <span className="items-center justify-center font-semibold text-white">15</span>
                </span>
              </div>
              <div className="flex items-center justify-center py-3">
                <span>
                  Sun <span className="items-center justify-center font-semibold text-white">16</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-auto">
            <div className="sticky left-0 z-10 w-14 flex-none bg-gray-900 ring-1 ring-white/5" />
            <div className="grid flex-auto grid-cols-1 grid-rows-1">
              {/* Horizontal lines */}
              <div
                style={{ gridTemplateRows: 'repeat(48, minmax(3.5rem, 1fr))' }}
                className="col-start-1 col-end-2 row-start-1 grid divide-y divide-white/5"
              >
                <div className="row-end-1 h-7" />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    12AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    1AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    2AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    3AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    4AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    5AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    6AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    7AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    8AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    9AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    10AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    11AM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    12PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    1PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    2PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    3PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    4PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    5PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    6PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    7PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    8PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    9PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    10PM
                  </div>
                </div>
                <div />
                <div>
                  <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-500">
                    11PM
                  </div>
                </div>
                <div />
              </div>

              {/* Vertical lines */}
              <div className="col-start-1 col-end-2 row-start-1 hidden grid-rows-1 divide-x divide-white/5 sm:grid sm:grid-cols-7">
                <div className="col-start-1 row-span-full" />
                <div className="col-start-2 row-span-full" />
                <div className="col-start-3 row-span-full" />
                <div className="col-start-4 row-span-full" />
                <div className="col-start-5 row-span-full" />
                <div className="col-start-6 row-span-full" />
                <div className="col-start-7 row-span-full" />
                <div className="col-start-8 row-span-full w-8" />
              </div>

              {/* Events */}
              <ol
                style={{ gridTemplateRows: '1.75rem repeat(288, minmax(0, 1fr)) auto' }}
                className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8"
              >
                <li
                  style={{ gridRow: '74 / span 12' }}
                  className="relative mt-px flex before:pointer-events-none before:absolute before:inset-1 before:z-0 before:rounded-lg before:bg-gray-900 sm:col-start-3"
                >
                  <a
                    href="#"
                    className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-blue-600/15 p-2 text-xs/5 hover:bg-blue-600/20"
                  >
                    <p className="order-1 font-semibold text-blue-300">Breakfast</p>
                    <p className="text-blue-400 group-hover:text-blue-300">
                      <time dateTime="2022-01-12T06:00">6:00 AM</time>
                    </p>
                  </a>
                </li>
                <li
                  style={{ gridRow: '92 / span 30' }}
                  className="relative mt-px flex before:pointer-events-none before:absolute before:inset-1 before:z-0 before:rounded-lg before:bg-gray-900 sm:col-start-3"
                >
                  <a
                    href="#"
                    className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-pink-600/15 p-2 text-xs/5 hover:bg-pink-600/20"
                  >
                    <p className="order-1 font-semibold text-pink-300">Flight to Paris</p>
                    <p className="text-pink-400 group-hover:text-pink-300">
                      <time dateTime="2022-01-12T07:30">7:30 AM</time>
                    </p>
                  </a>
                </li>
                <li
                  style={{ gridRow: '122 / span 24' }}
                  className="relative mt-px hidden before:pointer-events-none before:absolute before:inset-1 before:z-0 before:rounded-lg before:bg-gray-900 sm:col-start-6 sm:flex"
                >
                  <a
                    href="#"
                    className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-white/10 p-2 text-xs/5 hover:bg-white/15"
                  >
                    <p className="order-1 font-semibold text-gray-300">Meeting with design team at Disney</p>
                    <p className="text-gray-400 group-hover:text-gray-300">
                      <time dateTime="2022-01-15T10:00">10:00 AM</time>
                    </p>
                  </a>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
