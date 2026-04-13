import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Target,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useApplications } from '@/hooks/use-admin-applications'
import { useApplicationsStore } from '@/lib/stores/applications-store'
import type { ApplicationStatus } from '@/lib/types/applications.types'
import { STATUS_FILTER_OPTIONS } from './ApplicationTypes'
import { ApplicationCard } from './ApplicationCard'
import { CustomDropDown } from '../../../components/ui/CustomDropDown'
import { CommandPallete } from '../../../components/ui/CommandPallete'
import type { CommandPalleteItem } from '../../../components/ui/CommandPallete'
import { Pagination } from '../../../components/ui/Pagination'

export function ApplicationsList({ initialStage }: { initialStage?: string }) {
  const navigate = useNavigate()

  const statusFilter = useApplicationsStore((s) => s.activeStatusFilter)
  const setStatusFilter = useApplicationsStore((s) => s.setStatusFilter)
  const searchQuery = useApplicationsStore((s) => s.searchQuery)

  const [palleteOpen, setPalleteOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (initialStage) {
      setStatusFilter(initialStage as any)
    }
  }, [initialStage, setStatusFilter])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  // Optional: Add global CMD+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPalleteOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // TanStack Query data
  const {
    data: applications,
    isLoading,
    error,
  } = useApplications(statusFilter)

  // Client-side company name filter
  // We keep it just in case searchQuery is still populated externally, otherwise the Command Palette handles navigation
  const filteredApps = applications?.filter((app) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      app.targetCompany.toLowerCase().includes(query) ||
      app.targetRole.toLowerCase().includes(query)
    )
  }) || []

  const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE)
  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Command Palette Items
  const commandItems = applications?.map((app) => ({
    id: app.slug,
    name: app.targetCompany,
    description: app.targetRole,
  })) || []

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Modal */}
      <CommandPallete
        open={palleteOpen}
        setOpen={setPalleteOpen}
        items={commandItems}
        placeholder="Jump to application..."
        onSelect={(item: CommandPalleteItem) => {
          navigate({ to: '/applications/$slug', params: { slug: item.id } })
        }}
      />

      {/* Filters row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status filter dropdown */}
        <div className="w-full sm:w-64 z-10">
          <CustomDropDown
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(val: string) => setStatusFilter(val as ApplicationStatus | 'all')}
          />
        </div>

        {/* Search trigger button */}
        <div className="relative flex-1 group">
          <button
            onClick={() => setPalleteOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 py-1.5 pl-3 pr-2 text-sm text-zinc-500 dark:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-teal-500 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center">
              <Search className="mr-2 h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
              <span>Search company or role...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 font-sans text-xs text-zinc-500 dark:text-zinc-400">
              <abbr title="Command" className="no-underline">⌘</abbr>K
            </kbd>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Failed to load applications: {error.message}</span>
        </div>
      )}

      {!isLoading && !error && filteredApps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="mb-4 h-12 w-12 text-zinc-700" />
          <h3 className="text-lg font-medium text-zinc-400">
            No applications found
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Start by analysing a new job description above'}
          </p>
        </div>
      )}

      {!isLoading && !error && filteredApps.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {paginatedApps.map((app) => (
              <ApplicationCard
                key={app.slug}
                app={app}
                onClick={() => navigate({ to: '/applications/$slug', params: { slug: app.slug } })}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
