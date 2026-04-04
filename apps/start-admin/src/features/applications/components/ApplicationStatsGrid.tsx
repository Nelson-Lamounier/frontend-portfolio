import type { ApplicationDetail } from '@/lib/types/applications.types'
import { BookOpen, DollarSign, Lightbulb, MessageSquare } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  colour = 'text-zinc-400',
}: {
  readonly label: string
  readonly value: string
  readonly icon: React.ComponentType<{ className?: string }>
  readonly colour?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${colour}`} />
        <span className="text-xs font-medium text-zinc-500">{label}</span>
      </div>
      <p className={`mt-2 text-lg font-semibold ${colour}`}>{value}</p>
    </div>
  )
}

export interface ApplicationStats {
  cumulativeCostUsd: number
  cumulativeInputTokens: number
  cumulativeOutputTokens: number
  cumulativeThinkingTokens: number
}

export function ApplicationStatsGrid({ stats }: { readonly stats: ApplicationStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Pipeline Cost"
        value={`$${stats.cumulativeCostUsd.toFixed(4)}`}
        icon={DollarSign}
        colour="text-emerald-400"
      />
      <StatCard
        label="Input Tokens"
        value={stats.cumulativeInputTokens.toLocaleString()}
        icon={BookOpen}
        colour="text-sky-400"
      />
      <StatCard
        label="Output Tokens"
        value={stats.cumulativeOutputTokens.toLocaleString()}
        icon={MessageSquare}
        colour="text-amber-400"
      />
      <StatCard
        label="Thinking Tokens"
        value={stats.cumulativeThinkingTokens.toLocaleString()}
        icon={Lightbulb}
        colour="text-violet-400"
      />
    </div>
  )
}
