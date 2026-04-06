import { Sparkline } from './Sparkline'

interface AnalyticsSidebarProps {
  comments: any[]
  totalSaves?: number
  totalShares?: number
  likesHistory?: number[]
}

export function AnalyticsSidebar({
  comments,
  totalSaves = 0,
  totalShares = 0,
  likesHistory = [0, 0, 0, 0, 0],
}: AnalyticsSidebarProps) {
  // Always 0 metrics for these properties as requested
  const totalComments = comments?.length || 0
  const totalLikes = 0

  const sum = totalLikes + totalComments + totalSaves + totalShares || 1 // avoid div by zero
  const likesPct = Math.round((totalLikes / sum) * 100)
  const commentsPct = Math.round((totalComments / sum) * 100)
  const savesPct = Math.round((totalSaves / sum) * 100)
  const sharesPct = Math.round((totalShares / sum) * 100)

  return (
    <div className="space-y-6">
      {/* Overview Block */}
      <div className="rounded-xl border border-white/5 bg-gray-800/50 p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-400">Total Interactions</h3>
        <div className="mt-2 flex items-baseline gap-x-2">
          <span className="text-4xl font-bold tracking-tight text-white">
            {sum === 1 && totalComments === 0 ? 0 : sum}
          </span>
          <span className="text-sm text-gray-500">last 30 days</span>
        </div>

        <div className="mt-6 flex justify-between text-sm">
          <span className="text-gray-400">Likes Growth</span>
          <span className="font-medium text-teal-400">Flat (0 metrics)</span>
        </div>
        <div className="mt-2 w-full pt-2">
          <Sparkline data={likesHistory} width={300} height={40} color="#14b8a6" />
        </div>
      </div>

      {/* Interaction Breakdown */}
      <div className="rounded-xl border border-white/5 bg-gray-800/50 p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-400">Interaction Breakdown</h3>
        <div className="mt-6">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div style={{ width: `${likesPct}%` }} className="bg-teal-500" />
            <div style={{ width: `${commentsPct}%` }} className="bg-blue-500" />
            <div style={{ width: `${savesPct}%` }} className="bg-yellow-500" />
            <div style={{ width: `${sharesPct}%` }} className="bg-purple-500" />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <li className="flex items-center gap-x-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span className="text-gray-400">Likes ({likesPct}%)</span>
            </li>
            <li className="flex items-center gap-x-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-gray-400">Comments ({commentsPct}%)</span>
            </li>
            <li className="flex items-center gap-x-2">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-gray-400">Saves ({savesPct}%)</span>
            </li>
            <li className="flex items-center gap-x-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-gray-400">Shares ({sharesPct}%)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="rounded-xl border border-white/5 bg-gray-800/50 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400">Sentiment Analysis</h3>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-400 ring-1 ring-inset ring-white/10 uppercase tracking-wide">
            Coming Soon
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Positive, neutral, and negative classification using Amazon Bedrock.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Positive</span>
            <span className="font-medium text-white">0%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5"></div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Neutral</span>
            <span className="font-medium text-white">0%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5"></div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Negative</span>
            <span className="font-medium text-white">0%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5"></div>
        </div>
      </div>

      {/* Leaderboard Placeholders */}
      <div className="rounded-xl border border-white/5 bg-gray-800/50 p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-400">Top Contributors</h3>
        <ul className="mt-4 space-y-4">
          {[1, 2, 3].map((rank) => (
            <li key={rank} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-x-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-gray-400">
                  {rank}
                </span>
                <span className="text-gray-300">Not enough data</span>
              </div>
              <span className="text-gray-500 text-xs">0 interactions</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
