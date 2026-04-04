import { createFileRoute } from '@tanstack/react-router'
import { ApplicationStatsGrid } from '@/features/applications/components/ApplicationStatsGrid'

export const Route = createFileRoute('/_dashboard/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  // TODO: Fetch real global stats from a server endpoint
  const mockGlobalStats = {
    cumulativeCostUsd: 0,
    cumulativeInputTokens: 0,
    cumulativeOutputTokens: 0,
    cumulativeThinkingTokens: 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Reporting</h1>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-bold text-zinc-100">Global AI Usage</h2>
        <ApplicationStatsGrid stats={mockGlobalStats} />
      </div>
    </div>
  )
}
