'use client'

import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  ArrowUpCircleIcon,
  EllipsisHorizontalIcon,
  PlusSmallIcon,
} from '@heroicons/react/20/solid'
import { Stats } from '../../../components/ui/Stats'
import { useQuery } from '@tanstack/react-query'
import { finopsQueries, articlePipelineQueries } from '../queries'
import type { ArticleSummary } from '../../../server/articles'

const secondaryNavigation = [
  { name: 'Last 7 days', days: 7 },
  { name: 'Last 30 days', days: 30 },
  { name: 'All-time', days: 365 },
]

const statuses = {
  published: 'bg-green-500/10 text-green-500 ring-green-500/10',
  draft: 'bg-white/5 text-zinc-400 ring-white/10',
  review: 'bg-yellow-500/10 text-yellow-500 ring-yellow-500/10',
}

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function ReportContainer() {
  const [period, setPeriod] = useState(7)
  const [activeTab, setActiveTab] = useState<'all' | 'pipelines' | 'chatbot' | 'selfhealing'>('all')

  const tabs = [
    { id: 'all', name: 'Combined Overview' },
    { id: 'pipelines', name: 'Content Pipelines' },
    { id: 'chatbot', name: 'Chatbot Application' },
    { id: 'selfhealing', name: 'Self-Healing Automation' },
  ]

  // Fetch real data
  const { data: realtimeUsage, isLoading: isRealtimeLoading } = useQuery(finopsQueries.realtimeUsage(period))
  const { data: billedCosts, isLoading: isCostsLoading } = useQuery(finopsQueries.billedCosts(period))
  const { data: articles, isLoading: isArticlesLoading } = useQuery(articlePipelineQueries.all())
  const { data: chatbotUsage, isLoading: isChatbotLoading } = useQuery(finopsQueries.chatbotUsage(period))
  const { data: selfHealingUsage, isLoading: isSelfHealingLoading } = useQuery(finopsQueries.selfHealingUsage(period))

  // Compute stats
  const totalArticles = articles?.length || 0
  const invocations = realtimeUsage?.invocations || 0
  
  // Compute Total Costs from Cost Explorer
  let totalCost = 0
  if (billedCosts) {
    for (const day of billedCosts) {
      if (day.Groups) {
        for (const group of day.Groups) {
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0')
          totalCost += amount
        }
      }
    }
  }

  const avgCostPerArticle = totalArticles > 0 ? (totalCost / totalArticles) : 0
  const avgGenTime = realtimeUsage?.processingDuration || 0
  const avgBedrockMs = realtimeUsage?.bedrockConverseDuration || 0
  
  const stats = [
    { 
      name: 'Total Articles', 
      value: isArticlesLoading ? '...' : totalArticles.toString(), 
      change: `Data across the entire DynamoDB table`, changeType: 'positive' 
    },
    { 
      name: 'Agent Invocations', 
      value: isRealtimeLoading ? '...' : invocations.toString(), 
      change: `${period} Days (CloudWatch)`, changeType: 'positive' 
    },
    { 
      name: 'Avg Cost / Article', 
      value: isCostsLoading ? '...' : `$${avgCostPerArticle.toFixed(3)}`, 
      change: `Total Billed: $${totalCost.toFixed(2)} (Cost Explorer)`, changeType: 'negative' 
    },
    { 
      name: 'Avg Processing Time', 
      value: isRealtimeLoading ? '...' : `${(avgGenTime / 1000).toFixed(2)}s`, 
      change: `Bedrock wait: ${(avgBedrockMs / 1000).toFixed(2)}s (CloudWatch)`, changeType: 'positive' 
    },
  ]

  const chatbotInvocations = chatbotUsage?.invocationCount || 0
  const avgPromptLen = chatbotUsage?.promptLength || 0
  const avgResponseLen = chatbotUsage?.responseLength || 0
  const blocked = chatbotUsage?.blockedInputs || 0
  const redacted = chatbotUsage?.redactedOutputs || 0
  const totalInterceptions = blocked + redacted
  const chatbotLatency = chatbotUsage?.invocationLatency || 0

  // Estimated Chatbot Avg Cost based on Sonnet 3
  const inputCostPer1M = 3
  const outputCostPer1M = 15
  const estPromptTokens = avgPromptLen / 4
  const estResponseTokens = avgResponseLen / 4
  const avgChatbotCost = ((estPromptTokens / 1_000_000) * inputCostPer1M) + ((estResponseTokens / 1_000_000) * outputCostPer1M)

  const chatbotStats = [
    { 
      name: 'Total Chat Requests', 
      value: isChatbotLoading ? '...' : chatbotInvocations.toString(), 
      change: `${period} Days (CloudWatch)`, changeType: 'positive' 
    },
    { 
      name: 'Est. Cost / Request', 
      value: isChatbotLoading ? '...' : `$${avgChatbotCost.toFixed(5)}`, 
      change: 'Derived from Context Size estimates', changeType: 'negative' 
    },
    { 
      name: 'Avg Response Latency', 
      value: isChatbotLoading ? '...' : `${(chatbotLatency / 1000).toFixed(2)}s`, 
      change: 'End-to-End Chatbot Wait', changeType: 'positive' 
    },
    { 
      name: 'Security Interceptions', 
      value: isChatbotLoading ? '...' : totalInterceptions.toString(), 
      change: `Blocked Prompts: ${blocked} | Redacted: ${redacted}`, changeType: totalInterceptions > 0 ? 'negative' : 'positive' 
    },
  ]

  const shInputTokens = selfHealingUsage?.inputTokens || 0
  const shOutputTokens = selfHealingUsage?.outputTokens || 0
  const shTotalTokens = shInputTokens + shOutputTokens
  const BUDGET = 100000
  const shEstimatedCost = ((shInputTokens / 1_000_000) * inputCostPer1M) + ((shOutputTokens / 1_000_000) * outputCostPer1M)

  const selfHealingStats = [
    { 
      name: 'Token Budget Used', 
      value: isSelfHealingLoading ? '...' : `${Math.round((shTotalTokens / BUDGET) * 100)}%`, 
      change: `${shTotalTokens.toLocaleString()} / 100k Token Alarm Limit`, changeType: shTotalTokens > BUDGET ? 'negative' : 'positive' 
    },
    { 
      name: 'Input Tokens', 
      value: isSelfHealingLoading ? '...' : shInputTokens.toLocaleString(), 
      change: 'Analyzed Logs/Metrics', changeType: 'positive' 
    },
    { 
      name: 'Output Tokens', 
      value: isSelfHealingLoading ? '...' : shOutputTokens.toLocaleString(), 
      change: 'Remediation Plans Generated', changeType: 'positive' 
    },
    { 
      name: 'Cumulated Cost', 
      value: isSelfHealingLoading ? '...' : `$${shEstimatedCost.toFixed(4)}`, 
      change: 'Estimated token pricing', changeType: 'negative' 
    },
  ]

  // Combined Overview Data
  const isAgentActive = shTotalTokens > 0 
  const combinedTotalRequests = totalArticles + chatbotInvocations + (isAgentActive ? 1 : 0)
  const combinedEstCost = (chatbotInvocations * avgChatbotCost) + shEstimatedCost
  const combinedInputTokens = (chatbotInvocations * estPromptTokens) + shInputTokens
  const combinedOutputTokens = (chatbotInvocations * estResponseTokens) + shOutputTokens
  const isLoadingAny = isRealtimeLoading || isCostsLoading || isArticlesLoading || isChatbotLoading || isSelfHealingLoading

  const combinedStats = [
    {
      name: 'Total AI Executions',
      value: isLoadingAny ? '...' : combinedTotalRequests.toLocaleString(),
      change: 'Pipelines, Chats & Automations', changeType: 'positive'
    },
    {
      name: 'Est. Additional Cost (Tokens)',
      value: isLoadingAny ? '...' : `$${combinedEstCost.toFixed(4)}`,
      change: `Current Billed: $${totalCost.toFixed(2)}`, changeType: 'negative'
    },
    {
      name: 'Est. Input Tokens Processed',
      value: isLoadingAny ? '...' : Math.round(combinedInputTokens).toLocaleString(),
      change: 'Prompts & Log Analysis', changeType: 'positive'
    },
    {
      name: 'Est. Output Tokens Rendered',
      value: isLoadingAny ? '...' : Math.round(combinedOutputTokens).toLocaleString(),
      change: 'Responses & Remediation', changeType: 'positive'
    }
  ]

  // Compute Pipelines
  const draftArticles = articles?.filter((a: ArticleSummary) => a.status === 'draft') || []
  const reviewArticles = articles?.filter((a: ArticleSummary) => a.status === 'review') || []
  const publishedArticles = articles?.filter((a: ArticleSummary) => a.status === 'published') || []

  const pipelines = [
    {
      id: 1,
      name: 'Draft',
      count: draftArticles.length,
      articles: draftArticles.slice(0, 5).map((a: ArticleSummary) => ({
        title: a.title || a.pk.replace('ARTICLE#', ''),
        detail: `Updated: ${a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : 'Unknown'}`,
        status: 'draft',
      })),
    },
    {
      id: 2,
      name: 'In Review',
      count: reviewArticles.length,
      articles: reviewArticles.slice(0, 5).map((a: ArticleSummary) => ({
        title: a.title || a.pk.replace('ARTICLE#', ''),
        detail: `Updated: ${a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : 'Unknown'}`,
        status: 'review',
      })),
    },
    {
      id: 3,
      name: 'Published',
      count: publishedArticles.length,
      articles: publishedArticles.slice(0, 5).map((a: ArticleSummary) => ({
        title: a.title || a.pk.replace('ARTICLE#', ''),
        detail: `Published: ${a.publishedAt || a.updatedAt ? new Date(a.publishedAt || a.updatedAt!).toLocaleDateString() : 'Unknown'}`,
        status: 'published',
      })),
    },
  ]

  // Recent generation activity from Articles (just grabbing the latest ones as proxy for generations)
  const recentArticles = articles 
    ? [...articles].sort((a: ArticleSummary, b: ArticleSummary) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 10)
    : []

  const days = [
    {
      date: `Recent Activity (Last ${Math.min(recentArticles.length, 10)} records)`,
      dateTime: new Date().toISOString(),
      transactions: recentArticles.map((a: ArticleSummary) => ({
        id: a.pk,
        slug: a.pk.replace('ARTICLE#', ''),
        amount: 'N/A tokens',
        tax: 'N/A',
        status: a.status || 'draft',
        client: (a as unknown as Record<string, string>).category || 'Uncategorised',
        description: a.excerpt || 'No description available',
        title: a.title || a.pk.replace('ARTICLE#', ''),
        icon: ArrowUpCircleIcon,
        genTime: 'N/A',
      })),
    },
  ]

  return (
    <>
      <main>
        <div className="relative isolate overflow-hidden">
          {/* Secondary navigation */}
          <header className="pt-6 pb-4 sm:pb-6">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
              <h1 className="text-base/7 font-semibold text-white">AI Generation Metrics</h1>
              <div className="order-last flex w-full gap-x-8 text-sm/6 font-semibold sm:order-0 sm:w-auto sm:border-l sm:border-white/10 sm:pl-6 sm:text-sm/7">
                {secondaryNavigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setPeriod(item.days)}
                    className={period === item.days ? 'text-indigo-400' : 'text-zinc-300 hover:text-white'}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <a
                href="#"
                className="ml-auto flex items-center gap-x-1 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                <PlusSmallIcon aria-hidden="true" className="-ml-1.5 size-5" />
                New generation
              </a>
            </div>
          </header>

          {/* Tabs Navigation */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 mb-4">
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={classNames(
                    activeTab === tab.id
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5 border border-transparent',
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors'
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 mb-12">
            
            {/* Combined Overview */}
            {activeTab === 'all' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-indigo-400">Aggregated AI Activity</h2>
                </div>
                <Stats stats={combinedStats} />
              </div>
            )}

            {/* Content Pipelines */}
            {activeTab === 'pipelines' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-indigo-400">Content Pipelines</h2>
                </div>
                <Stats stats={stats} />
              </div>
            )}

            {/* Chatbot Application */}
            {activeTab === 'chatbot' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-indigo-400">Chatbot Application</h2>
                </div>
                <Stats stats={chatbotStats} />
              </div>
            )}

            {/* Self-Healing Automation */}
            {activeTab === 'selfhealing' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-base/7 font-semibold text-indigo-400">Self-Healing Automation</h2>
                </div>
                <Stats stats={selfHealingStats} />
              </div>
            )}

          </div>

          <div
            aria-hidden="true"
            className="absolute top-full left-0 -z-10 mt-96 origin-top-left translate-y-40 -rotate-90 transform-gpu opacity-10 blur-3xl sm:left-1/2 sm:-mt-10 sm:-ml-96 sm:translate-y-0 sm:rotate-0 sm:opacity-30"
          >
            <div
              style={{
                clipPath:
                  'polygon(100% 38.5%, 82.6% 100%, 60.2% 37.7%, 52.4% 32.1%, 47.5% 41.8%, 45.2% 65.6%, 27.5% 23.4%, 0.1% 35.3%, 17.9% 0%, 27.7% 23.4%, 76.2% 2.5%, 74.2% 56%, 100% 38.5%)',
              }}
              className="aspect-1154/678 w-288.5 bg-linear-to-br from-[#FF80B5] to-[#9089FC]"
            />
          </div>
        </div>

        <div className="space-y-16 py-16 xl:space-y-20">
          {/* Recent activity table */}
          <div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="mx-auto max-w-2xl text-base font-semibold text-white lg:mx-0 lg:max-w-none">
                Recent Generation Activity
              </h2>
            </div>
            <div className="mt-6 overflow-hidden border-t border-white/5">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
                  <table className="w-full text-left">
                    <thead className="sr-only">
                      <tr>
                        <th>Article</th>
                        <th className="hidden sm:table-cell">Model</th>
                        <th>More details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => (
                        <Fragment key={day.dateTime}>
                          <tr className="text-sm/6 text-white">
                            <th scope="colgroup" colSpan={3} className="relative isolate py-2 font-semibold">
                              <time dateTime={day.dateTime}>{day.date}</time>
                              <div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-white/10 bg-white/2.5" />
                              <div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-white/10 bg-white/2.5" />
                            </th>
                          </tr>
                          {day.transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td className="relative py-5 pr-6">
                                <div className="flex gap-x-6">
                                  <transaction.icon
                                    aria-hidden="true"
                                    className="hidden h-6 w-5 flex-none text-zinc-500 sm:block"
                                  />
                                  <div className="flex-auto">
                                    <div className="text-sm/6 font-medium text-white">{transaction.title}</div>
                                    <div className="mt-1 text-xs/5 text-zinc-400">{transaction.description}</div>
                                  </div>
                                </div>
                                <div className="absolute right-full bottom-0 h-px w-screen bg-white/5" />
                                <div className="absolute bottom-0 left-0 h-px w-screen bg-white/5" />
                              </td>
                              <td className="hidden py-5 pr-6 sm:table-cell">
                                <div className="flex items-start gap-x-3">
                                  <div className="text-sm/6 text-white">{transaction.client}</div>
                                  <div
                                    className={classNames(
                                      statuses[transaction.status as keyof typeof statuses] || statuses.draft,
                                      'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                                    )}
                                  >
                                    {transaction.status}
                                  </div>
                                </div>
                                <div className="mt-1 flex gap-2 text-xs/5 text-zinc-400">
                                  <span>Tokens: {transaction.amount}</span>
                                  <span>&middot;</span>
                                  <span>Gen. Time: {transaction.genTime}</span>
                                </div>
                              </td>
                              <td className="py-5 text-right">
                                <div className="flex justify-end">
                                  <Link
                                    to="/articles"
                                    className="text-sm/6 font-medium text-indigo-400 hover:text-indigo-300"
                                  >
                                    View<span className="hidden sm:inline"> article</span>
                                    <span className="sr-only">
                                      , {transaction.title}
                                    </span>
                                  </Link>
                                </div>
                                <div className="mt-1 text-xs/5 text-zinc-400">
                                  Cost <span className="text-white">{transaction.tax}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Content Pipeline */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
              <div className="flex items-center justify-between">
                <h2 className="text-base/7 font-semibold text-white">Content Pipeline</h2>
                <Link to="/articles" className="text-sm/6 font-semibold text-indigo-400 hover:text-indigo-300">
                  View all articles &rarr;
                </Link>
              </div>
              <ul role="list" className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8">
                {pipelines.map((pipeline) => (
                  <li key={pipeline.id} className="overflow-hidden rounded-xl outline -outline-offset-1 outline-white/10">
                    <div className="flex items-center gap-x-4 border-b border-white/10 bg-zinc-800/50 p-6">
                      <div className="text-sm/6 font-semibold text-white">{pipeline.name}</div>
                      <div className="ml-2 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                        {pipeline.count}
                      </div>
                      <Menu as="div" className="relative ml-auto">
                        <MenuButton className="relative block text-zinc-500 hover:text-white">
                          <span className="absolute -inset-2.5" />
                          <span className="sr-only">Open options</span>
                          <EllipsisHorizontalIcon aria-hidden="true" className="size-5" />
                        </MenuButton>
                        <MenuItems
                          transition
                          className="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-zinc-800 py-2 outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                        >
                          <MenuItem>
                            <Link
                              to="/articles"
                              className="block px-3 py-1 text-sm/6 text-white data-focus:bg-white/5 data-focus:outline-hidden"
                            >
                              View list
                            </Link>
                          </MenuItem>
                        </MenuItems>
                      </Menu>
                    </div>
                    <dl className="-my-3 divide-y divide-white/10 px-6 py-4 text-sm/6">
                      {pipeline.articles.map((article) => (
                        <div key={article.title} className="flex flex-col py-3">
                          <dt className="text-sm/6 font-medium text-white truncate" title={article.title}>{article.title}</dt>
                          <dd className="mt-1 flex justify-between gap-x-4 text-xs/5 text-zinc-400">
                            <span>{article.detail}</span>
                            <span className="text-zinc-300 font-medium">{article.status}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
