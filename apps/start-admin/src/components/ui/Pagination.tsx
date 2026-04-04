import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/20/solid'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }
    
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const pages = getVisiblePages()

  return (
    <nav className="flex items-center justify-between border-t border-white/10 px-4 sm:px-0">
      <div className="-mt-px flex w-0 flex-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`inline-flex items-center border-t-2 border-transparent pt-4 pr-1 text-sm font-medium ${
            currentPage === 1 
              ? 'text-zinc-600 cursor-not-allowed' 
              : 'text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          }`}
        >
          <ArrowLongLeftIcon aria-hidden="true" className="mr-3 size-5" />
          Previous
        </button>
      </div>
      <div className="hidden md:-mt-px md:flex">
        {pages.map((p, i) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${i}`} className="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-zinc-500">
                ...
              </span>
            )
          }

          const pageNumber = p as number
          const isCurrent = pageNumber === currentPage

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={isCurrent ? "page" : undefined}
              className={`inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium ${
                isCurrent 
                  ? 'border-violet-500 text-violet-400' 
                  : 'border-transparent text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              {pageNumber}
            </button>
          )
        })}
      </div>
      <div className="-mt-px flex w-0 flex-1 justify-end">
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center border-t-2 border-transparent pt-4 pl-1 text-sm font-medium ${
            currentPage === totalPages 
              ? 'text-zinc-600 cursor-not-allowed' 
              : 'text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          }`}
        >
          Next
          <ArrowLongRightIcon aria-hidden="true" className="ml-3 size-5" />
        </button>
      </div>
    </nav>
  )
}

