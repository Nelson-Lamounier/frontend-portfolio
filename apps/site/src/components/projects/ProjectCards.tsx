/**
 * ProjectCards — grid cards for Tucaken-generated projects.
 *
 * Client component: filtering is client-side state, matching the legacy
 * ProjectsList UX. Cards link to the native /projects/[slug] case-study
 * page, not to GitHub — the case study is the portfolio surface; repo
 * links live on the detail page.
 *
 * Data source: the in-cluster public-api BFF via lib/projects (RDS,
 * visibility='public' only). Props are plain serialisable values because
 * this crosses the Server→Client Component boundary.
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import { FilterTabs } from './FilterTabs'
import { trackProjectView } from '@/lib/observability/analytics'

// =============================================================================
// TYPES
// =============================================================================

/** Serialisable card shape prepared by the /projects page. */
export interface ProjectCardData {
  slug: string
  name: string
  tagline: string | null
  typeLabel: string
  stack: string[]
  repositories: string[]
  tags: string[]
}

interface ProjectCardsProps {
  projects: ProjectCardData[]
  typeLabels: string[]
}

// =============================================================================
// ICONS
// =============================================================================

/** Arrow icon for the case-study CTA. */
function ArrowRightIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.75 5.75 9.25 8l-2.5 2.25"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
    </svg>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

/** How many stack chips fit on a card before we truncate with a +N. */
const MAX_STACK_CHIPS = 6

export function ProjectCards({ projects, typeLabels }: ProjectCardsProps) {
  const [activeType, setActiveType] = useState<string>('All')

  const filtered =
    activeType === 'All'
      ? projects
      : projects.filter((p) => p.typeLabel === activeType)

  return (
    <>
      {/* Hide the tab bar when every project shares one type — a single
          filter button next to "All" is visual noise, not navigation. */}
      {typeLabels.length > 1 && (
        <FilterTabs
          categories={['All', ...typeLabels]}
          activeCategory={activeType}
          setActiveCategory={setActiveType}
        />
      )}
      <ul
        role="list"
        className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((project) => (
          <Card as="li" key={project.slug}>
            <p className="relative z-10 text-xs font-medium tracking-wide text-teal-500 uppercase dark:text-teal-400">
              {project.typeLabel}
            </p>
            <h2 className="mt-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">
              <Card.Link
                href={`/projects/${project.slug}`}
                onClick={() => trackProjectView(project.name)}
              >
                {project.name}
              </Card.Link>
            </h2>
            {project.tagline && (
              <Card.Description>{project.tagline}</Card.Description>
            )}
            {project.stack.length > 0 && (
              <p className="relative z-10 mt-4 flex flex-wrap gap-1.5">
                {project.stack.slice(0, MAX_STACK_CHIPS).map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {name}
                  </span>
                ))}
                {project.stack.length > MAX_STACK_CHIPS && (
                  <span className="px-1 py-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    +{project.stack.length - MAX_STACK_CHIPS}
                  </span>
                )}
              </p>
            )}
            <p className="relative z-10 mt-6 flex items-center text-sm font-medium text-zinc-400 transition group-hover:text-teal-500 dark:text-zinc-200">
              <span>View case study</span>
              <ArrowRightIcon className="ml-1 h-4 w-4 flex-none" />
              {project.repositories.length > 0 && (
                <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                  {project.repositories.length}{' '}
                  {project.repositories.length === 1
                    ? 'repository'
                    : 'repositories'}
                </span>
              )}
            </p>
          </Card>
        ))}
      </ul>
    </>
  )
}
