import { BookOpen, DollarSign, Lightbulb, MessageSquare } from 'lucide-react'
import { StatsCard, type StatItem } from '../../../components/ui/StatsCard'

export interface ApplicationStats {
  cumulativeCostUsd: number
  cumulativeInputTokens: number
  cumulativeOutputTokens: number
  cumulativeThinkingTokens: number
}

export function ApplicationStatsGrid({ stats }: { readonly stats: ApplicationStats }) {
  const statItems: StatItem[] = [
    {
      name: 'Pipeline Cost',
      stat: `$${stats.cumulativeCostUsd.toFixed(4)}`,
      icon: DollarSign,
    },
    {
      name: 'Input Tokens',
      stat: stats.cumulativeInputTokens.toLocaleString(),
      icon: BookOpen,
    },
    {
      name: 'Output Tokens',
      stat: stats.cumulativeOutputTokens.toLocaleString(),
      icon: MessageSquare,
    },
    {
      name: 'Thinking Tokens',
      stat: stats.cumulativeThinkingTokens.toLocaleString(),
      icon: Lightbulb,
    },
  ]

  return <StatsCard stats={statItems} />
}
