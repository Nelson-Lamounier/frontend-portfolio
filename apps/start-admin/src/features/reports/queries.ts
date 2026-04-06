import { queryOptions } from '@tanstack/react-query'
import { getRealtimeUsageFn, getBilledCostsFn, getChatbotUsageFn, getSelfHealingUsageFn } from '../../server/finops'
import { getArticlesFn } from '../../server/articles'

export const finopsQueries = {
  realtimeUsage: (days: number) =>
    queryOptions({
      queryKey: ['finops', 'realtimeUsage', days],
      queryFn: () => getRealtimeUsageFn({ data: { days } }),
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }),
  billedCosts: (days: number) =>
    queryOptions({
      queryKey: ['finops', 'billedCosts', days],
      queryFn: () => getBilledCostsFn({ data: { days } }),
      staleTime: 60 * 60 * 1000, // Cache for 1 hour
    }),
  chatbotUsage: (days: number) =>
    queryOptions({
      queryKey: ['finops', 'chatbotUsage', days],
      queryFn: () => getChatbotUsageFn({ data: { days } }),
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }),
  selfHealingUsage: (days: number) =>
    queryOptions({
      queryKey: ['finops', 'selfHealingUsage', days],
      queryFn: () => getSelfHealingUsageFn({ data: { days } }),
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }),
}

export const articlePipelineQueries = {
  all: () =>
    queryOptions({
      queryKey: ['articles', 'pipeline', 'all'],
      queryFn: () => getArticlesFn({ data: { status: 'all' } }),
      staleTime: 60 * 1000,
    }),
}
