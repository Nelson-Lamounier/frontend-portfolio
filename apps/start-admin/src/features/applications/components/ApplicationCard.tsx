import {
  Building2,
  Briefcase,
  ChevronRight,
  Clock,
  DollarSign,
} from 'lucide-react'
import type { ApplicationSummary } from '@/lib/types/applications.types'
import { RECOMMENDATION_LABELS } from './ApplicationTypes'
import { FitRatingChip } from './FitRatingChip'
import { LinkCard } from '../../../components/ui/LinkCards'

interface ApplicationCardProps {
  readonly app: ApplicationSummary
  readonly onClick: () => void
}

export function ApplicationCard({
  app,
  onClick,
}: ApplicationCardProps) {
  const dateStr = new Date(app.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <LinkCard
      onClick={onClick}
      icon={<Building2 className="h-5 w-5 text-gray-400" />}
      title={<span className="text-sm font-semibold text-zinc-100">{app.targetCompany}</span>}
      subtitle={
        <div className="mt-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="truncate">{app.targetRole}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {app.fitRating && <FitRatingChip rating={app.fitRating} />}
            {app.recommendation && (
              <span className="text-xs text-zinc-500">
                {RECOMMENDATION_LABELS[app.recommendation]}
              </span>
            )}
          </div>
        </div>
      }
      topRight={
        <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-violet-400" />
      }
      bottom={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {dateStr}
            </span>
            {app.costUsd !== undefined && app.costUsd > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${app.costUsd.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      }
    />
  )
}

