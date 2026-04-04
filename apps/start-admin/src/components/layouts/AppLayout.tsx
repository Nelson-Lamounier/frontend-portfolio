'use client'

import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react'
import {
  Bars3Icon,
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  XMarkIcon,
  SparklesIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart3,
  Activity,
  Gauge,
  GitBranch,
  LineChart,
  HeartPulse,
  MessageSquareText,
  ExternalLink,
  LogOut,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Comments', href: '/comments', icon: MessageSquareText },
  { name: 'Applications', href: '/applications', icon: BriefcaseIcon },
  { name: 'Articles', href: '/articles', icon: DocumentDuplicateIcon },
  { name: 'Resumes', href: '/resumes', icon: DocumentTextIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'AI Agent', href: '/ai-agent', icon: SparklesIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Reports', href: '/reports', icon: ChartPieIcon },
]
const observabilityLinks = [
  {
    id: 1,
    name: 'Grafana',
    href: 'https://ops.nelsonlamounier.com/grafana',
    icon: BarChart3,
  },
  {
    id: 2,
    name: 'Prometheus',
    href: 'https://ops.nelsonlamounier.com/prometheus',
    icon: Activity,
  },
  {
    id: 3,
    name: 'Prometheus Metrics',
    href: 'https://ops.nelsonlamounier.com/prometheus/metrics',
    icon: Gauge,
  },
  {
    id: 4,
    name: 'ArgoCD',
    href: 'https://ops.nelsonlamounier.com/argocd/',
    icon: GitBranch,
  },
  {
    id: 5,
    name: 'Google Analytics',
    href: 'https://analytics.google.com',
    icon: LineChart,
  },
  {
    id: 6,
    name: 'Health Check',
    href: 'https://nelsonlamounier.com/api/health',
    icon: HeartPulse,
  },
]
function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

import avatarImage from '@/images/avatar.jpg'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    let targetUrl = '/login'
    try {
      const { logoutFn } = await import('@/server/auth')
      const res = await logoutFn()
      if (res?.logoutUrl) {
        targetUrl = res.logoutUrl
      }
    } catch {
      // ignore
    }
    globalThis.location.href = targetUrl
  }

  return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-gray-900">
        <body class="h-full">
        ```
      */}
      <div>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                  </button>
                </div>
              </TransitionChild>

              {/* Sidebar component, swap this element with another sidebar if you like */}
              <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring ring-white/10 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10">
                <div className="relative flex h-16 shrink-0 items-center">
                  <img
                    alt="Your Company"
                    src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                    className="h-8 w-auto"
                  />
                </div>
                <nav className="relative flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              activeProps={{ className: 'bg-white/5 text-white' }}
                              inactiveProps={{ className: 'text-gray-400 hover:bg-white/5 hover:text-white' }}
                              className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
                            >
                              {({ isActive }) => (
                                <>
                                  <item.icon
                                    aria-hidden="true"
                                    className={classNames(
                                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                                      'size-6 shrink-0',
                                    )}
                                  />
                                  {item.name}
                                </>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li>
                      <div className="text-xs/6 font-semibold text-gray-400">Observability</div>
                      <ul role="list" className="-mx-2 mt-2 space-y-1">
                        {observabilityLinks.map((link) => (
                          <li key={link.name}>
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={classNames(
                                'text-gray-400 hover:bg-white/5 hover:text-white',
                                'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold',
                              )}
                            >
                              <span
                                className={classNames(
                                  'border-white/10 text-gray-400 group-hover:border-white/20 group-hover:text-white',
                                  'flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white/5 text-[0.625rem] font-medium',
                                )}
                              >
                                <link.icon aria-hidden="true" className="size-4 shrink-0" />
                              </span>
                              <span className="truncate">{link.name}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li className="-mx-6 mt-auto">
                      <a
                        href="/"
                        className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"
                      >
                        <ExternalLink aria-hidden="true" className="size-5 text-gray-400" />
                        Back to Site
                      </a>
                      <div className="flex items-center gap-x-4 border-t border-white/10 px-6 py-3">
                        <img
                          alt="Admin avatar"
                          src={avatarImage as any}
                          className="size-8 shrink-0 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm/6 font-medium text-white">Admin</p>
                          <p className="truncate text-xs text-gray-400">admin@nelsonlamounier.com</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="text-gray-400 hover:text-white"
                          title="Sign Out"
                        >
                          <LogOut className="size-5" />
                        </button>
                      </div>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/10 bg-black/10 px-6">
            <div className="flex h-16 shrink-0 items-center">
              <img
                alt="Your Company"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                className="h-8 w-auto"
              />
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href as any}
                          activeProps={{ className: 'bg-white/5 text-white' }}
                          inactiveProps={{ className: 'text-gray-400 hover:bg-white/5 hover:text-white' }}
                          className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                aria-hidden="true"
                                className={classNames(
                                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                                  'size-6 shrink-0',
                                )}
                              />
                              {item.name}
                            </>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li>
                  <div className="text-xs/6 font-semibold text-gray-400">Observability</div>
                  <ul role="list" className="-mx-2 mt-2 space-y-1">
                    {observabilityLinks.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classNames(
                            'text-gray-400 hover:bg-white/5 hover:text-white',
                            'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold',
                          )}
                        >
                          <span
                            className={classNames(
                              'border-white/10 text-gray-400 group-hover:border-white/20 group-hover:text-white',
                              'flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white/5 text-[0.625rem] font-medium',
                            )}
                          >
                            <link.icon aria-hidden="true" className="size-4 shrink-0" />
                          </span>
                          <span className="truncate">{link.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="-mx-6 mt-auto">
                  <a
                    href="/"
                    className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"
                  >
                    <ExternalLink aria-hidden="true" className="size-5 text-gray-400" />
                    Back to Site
                  </a>
                  <div className="flex items-center gap-x-4 border-t border-white/10 px-6 py-3">
                    <img
                      alt="Admin avatar"
                      src={avatarImage as any}
                      className="size-8 shrink-0 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm/6 font-medium text-white">Admin</p>
                      <p className="truncate text-xs text-gray-400">admin@nelsonlamounier.com</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-gray-400 hover:text-white"
                      title="Sign Out"
                    >
                      <LogOut className="size-5" />
                    </button>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 after:pointer-events-none after:absolute after:inset-0 after:border-b after:border-white/10 after:bg-black/10 sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-400 hover:text-white lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
          <div className="flex-1 text-sm/6 font-semibold text-white">Dashboard</div>
          <button type="button" onClick={handleSignOut} className="flex items-center gap-x-4">
            <span className="sr-only">Your profile</span>
            <img
              alt="Admin avatar"
              src={avatarImage as any}
              className="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
            />
          </button>
        </div>

        <main className="py-10 lg:pl-72">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </>
  )
}
