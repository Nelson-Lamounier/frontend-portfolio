import type { FitRating } from '@/lib/types/applications.types'
import { FIT_RATING_COLOURS, FIT_RATING_LABELS } from './ApplicationTypes'

export function FitRatingChip({ rating }: { readonly rating: FitRating }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${FIT_RATING_COLOURS[rating]}`}
    >
      {FIT_RATING_LABELS[rating]}
    </span>
  )
}
