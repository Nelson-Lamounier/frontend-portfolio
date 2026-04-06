/**
 * @format
 * FinOps and Observability Metrics server functions for the admin dashboard.
 *
 * Provides operations to fetch CloudWatch usage metrics and Cost Explorer billing data.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { requireAuth } from './auth-guard'

const REGION = process.env.AWS_REGION || 'eu-west-1'

// =============================================================================
// Clients (Lazy Singleton)
// =============================================================================

let _cwClient: CloudWatchClient | null = null
let _ceClient: CostExplorerClient | null = null

function getCwClient(): CloudWatchClient {
  if (!_cwClient) {
    _cwClient = new CloudWatchClient({ region: REGION })
  }
  return _cwClient
}

function getCeClient(): CostExplorerClient {
  if (!_ceClient) {
    _ceClient = new CostExplorerClient({ region: 'us-east-1' }) // cost explorer is always us-east-1 global
  }
  return _ceClient
}

// =============================================================================
// Input Schemas
// =============================================================================

const periodSchema = z.object({
  days: z.number().int().min(1).max(365).default(7)
}).default({ days: 7 })

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Retrieves real-time usage and performance metrics from CloudWatch.
 */
export const getRealtimeUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const endTime = new Date()
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - data.days)
    
    // CloudWatch GetMetricData maximum period is 86400 (daily) or we can specify the whole window
    const periodInSeconds = data.days * 24 * 60 * 60

    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: 'inputTokens',
          MetricStat: {
            Metric: { Namespace: 'BedrockMultiAgent', MetricName: 'InputTokens' },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'outputTokens',
          MetricStat: {
            Metric: { Namespace: 'BedrockMultiAgent', MetricName: 'OutputTokens' },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'thinkingTokens',
          MetricStat: {
            Metric: { Namespace: 'BedrockMultiAgent', MetricName: 'ThinkingTokens' },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'processingDuration',
          MetricStat: {
            Metric: { Namespace: 'BedrockMultiAgent', MetricName: 'ProcessingDurationMs' },
            Period: periodInSeconds,
            Stat: 'Average',
          },
          ReturnData: true,
        },
        {
          Id: 'bedrockConverseDuration',
          MetricStat: {
            Metric: { Namespace: 'BedrockMultiAgent', MetricName: 'BedrockConverseMs' },
            Period: periodInSeconds,
            Stat: 'Average',
          },
          ReturnData: true,
        },
        {
          Id: 'invocations',
          MetricStat: {
            Metric: { Namespace: 'BedrockMultiAgent', MetricName: 'InvocationCount' },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
      ],
    })

    const result = await getCwClient().send(command)
    
    const stats: Record<string, number> = {
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      processingDuration: 0,
      bedrockConverseDuration: 0,
      invocations: 0
    }

    if (result.MetricDataResults) {
      for (const res of result.MetricDataResults) {
        if (res.Id && res.Values && res.Values.length > 0) {
          stats[res.Id] = res.Values[0] ?? 0
        }
      }
    }

    return stats
  })

/**
 * Retrieves penny-accurate billed costs from AWS Cost Explorer.
 */
export const getBilledCostsFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - data.days)

    // Format dates to YYYY-MM-DD
    const endStr = endDate.toISOString().split('T')[0]
    // Cost explorer requires start date to be before end date, and end date is exclusive.
    const startStr = startDate.toISOString().split('T')[0]

    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: startStr, End: endStr },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost'],
      Filter: {
        Tags: {
          Key: 'Project',
          Values: ['bedrock'],
        },
      },
      GroupBy: [
        { Type: 'TAG', Key: 'aws:bedrock:inference-profile' },
      ],
    })

    try {
      const result = await getCeClient().send(command)
      return result.ResultsByTime ?? []
    } catch (e: any) {
      console.warn("Cost explorer query failed, returning empty cost structure:", e.message)
      return []
    }
  })

/**
 * Retrieves chatbot usage and security metrics.
 */
export const getChatbotUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const endTime = new Date()
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - data.days)
    
    const periodInSeconds = data.days * 24 * 60 * 60
    const dims = [{ Name: 'Environment', Value: 'development' }]

    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: 'invocationCount',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'InvocationCount', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'invocationLatency',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'InvocationLatency', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Average',
          },
          ReturnData: true,
        },
        {
          Id: 'invocationErrors',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'InvocationErrors', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'promptLength',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'PromptLength', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Average',
          },
          ReturnData: true,
        },
        {
          Id: 'responseLength',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'ResponseLength', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Average',
          },
          ReturnData: true,
        },
        {
          Id: 'blockedInputs',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'BlockedInputs', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'redactedOutputs',
          MetricStat: {
            Metric: { Namespace: 'BedrockChatbot', MetricName: 'RedactedOutputs', Dimensions: dims },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
      ],
    })

    const result = await getCwClient().send(command)
    
    const stats: Record<string, number> = {
      invocationCount: 0,
      invocationLatency: 0,
      invocationErrors: 0,
      promptLength: 0,
      responseLength: 0,
      blockedInputs: 0,
      redactedOutputs: 0,
    }

    if (result.MetricDataResults) {
      for (const res of result.MetricDataResults) {
        if (res.Id && res.Values && res.Values.length > 0) {
          stats[res.Id] = res.Values[0] ?? 0
        }
      }
    }

    return stats
  })

/**
 * Retrieves self-healing token metrics.
 */
export const getSelfHealingUsageFn = createServerFn({ method: 'GET' })
  .inputValidator(periodSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    const endTime = new Date()
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - data.days)
    
    const periodInSeconds = data.days * 24 * 60 * 60

    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: 'inputTokens',
          MetricStat: {
            Metric: { Namespace: 'self-healing-development/SelfHealing', MetricName: 'InputTokens' },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
        {
          Id: 'outputTokens',
          MetricStat: {
            Metric: { Namespace: 'self-healing-development/SelfHealing', MetricName: 'OutputTokens' },
            Period: periodInSeconds,
            Stat: 'Sum',
          },
          ReturnData: true,
        },
      ],
    })

    const result = await getCwClient().send(command)
    
    const stats: Record<string, number> = {
      inputTokens: 0,
      outputTokens: 0,
    }

    if (result.MetricDataResults) {
      for (const res of result.MetricDataResults) {
        if (res.Id && res.Values && res.Values.length > 0) {
          stats[res.Id] = res.Values[0] ?? 0
        }
      }
    }

    return stats
  })
