import { Loader2 } from 'lucide-react'
import type { ApplicationStatus } from '@/lib/types/applications.types'
import { STATUS_COLOURS, STATUS_LABELS } from './ApplicationTypes'

export function StatusBadge({ status }: { readonly status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[status]}`}
    >
      {status === 'analysing' && (
        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
      )}
      {STATUS_LABELS[status]}
    </span>
  )
}
