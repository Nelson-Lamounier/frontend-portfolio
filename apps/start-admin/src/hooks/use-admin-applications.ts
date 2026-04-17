import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { useToastStore } from '@/lib/stores/toast-store'
import type { ApplicationStatus, ApplicationSummary, ApplicationDetail, InterviewStage } from '@/lib/types/applications.types'
import { getApplicationsFn, deleteApplicationFn, getApplicationDetailFn, updateApplicationStatusFn } from '../server/applications'

const PIPELINE_POLL_INTERVAL = 5_000
const POLL_TIMEOUT_MS = 10 * 60 * 1_000

const ACTIVE_PIPELINE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'analysing',
  'coaching',
] as ApplicationStatus[])

export function useApplications(status = 'all') {
  const pollStartRef = useRef<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const query = useQuery<ApplicationSummary[]>({
    queryKey: adminKeys.applications.applications(status),
    queryFn: async () => {
      const data = await getApplicationsFn({ data: { status } })
      if (Array.isArray(data)) return data
      return []
    },
    refetchInterval: (queryResult) => {
      if (timedOut) return false

      const data = queryResult.state.data
      if (!data) return false

      const hasActive = data.some((app) =>
        ACTIVE_PIPELINE_STATUSES.has(app.status),
      )
      if (!hasActive) return false

      if (!pollStartRef.current) {
        pollStartRef.current = Date.now()
      }

      const elapsed = Date.now() - pollStartRef.current
      if (elapsed > POLL_TIMEOUT_MS) {
        setTimedOut(true)
        return false
      }

      return PIPELINE_POLL_INTERVAL
    },
  })

  useEffect(() => {
    const data = query.data
    if (!data) return

    const hasActive = data.some((app) =>
      ACTIVE_PIPELINE_STATUSES.has(app.status),
    )
    if (!hasActive) {
      pollStartRef.current = null
      setTimedOut(false)
    }
  }, [query.data])

  return { ...query, timedOut }
}

export function useApplicationDetail(slug: string) {
  const pollStartRef = useRef<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const query = useQuery<ApplicationDetail>({
    queryKey: adminKeys.applications.detail(slug),
    queryFn: async () => {
      if (slug.startsWith('mock-')) {
        const timestamp = Number.parseInt(slug.replace('mock-', ''), 10)
        const elapsed = Date.now() - timestamp
        // FAKE progress for 26 seconds to match FAKE_STEPS UI exactly
        const isReady = elapsed > 26000 
        return {
          slug,
          targetCompany: 'Mock Company Inc',
          targetRole: 'Mock Developer',
          status: isReady ? 'analysis-ready' : 'analysing',
          interviewStage: 'applied',
          createdAt: new Date(timestamp).toISOString(),
          updatedAt: new Date().toISOString(),
          context: {
            pipelineId: 'mock-abc',
            cumulativeInputTokens: 100,
            cumulativeOutputTokens: 200,
            cumulativeThinkingTokens: 0,
            cumulativeCostUsd: 0.05
          },
          research: isReady ? {
             fitSummary: 'This is a mock fit summary.',
             fitRating: 'STRONG_FIT',
             verifiedMatches: [],
             partialMatches: [],
             gaps: [],
             experienceSignals: { yearsExpected: '3+', domain: 'Web', leadership: 'None', scale: 'Global' },
             technologyInventory: { languages: [], frameworks: [], infrastructure: [], tools: [], methodologies: [] }
          } : null,
          analysis: isReady ? {
             analysisXml: '<xml>Mock</xml>',
             coverLetter: 'Dear Hiring Manager,\n\nI am a mock applicant.',
             metadata: { overallFitRating: 'STRONG_FIT', applicationRecommendation: 'APPLY' },
             resumeSuggestions: { additions: 1, reframes: 1, eslCorrections: 0, summary: 'Pretty good.' }
          } : null,
          interviewPrep: null
        } as ApplicationDetail
      }
      return getApplicationDetailFn({ data: slug }) as Promise<ApplicationDetail>
    },
    enabled: Boolean(slug),
    refetchInterval: (queryResult) => {
      if (timedOut) return false

      const status = queryResult.state.data?.status
      if (!status) return false

      const isActive = ACTIVE_PIPELINE_STATUSES.has(status)
      if (!isActive) return false

      // Start timeout timer on first active poll
      if (!pollStartRef.current) {
        pollStartRef.current = Date.now()
      }

      // Check if we've exceeded the timeout
      const elapsed = Date.now() - pollStartRef.current
      if (elapsed > POLL_TIMEOUT_MS) {
        setTimedOut(true)
        return false
      }

      return PIPELINE_POLL_INTERVAL
    },
  })

  // Reset timeout state when status changes to non-active
  useEffect(() => {
    const status = query.data?.status
    if (status && !ACTIVE_PIPELINE_STATUSES.has(status)) {
      pollStartRef.current = null
      setTimedOut(false)
    }
  }, [query.data?.status])

  return { ...query, timedOut }
}

interface StatusUpdateVariables {
  readonly slug: string
  readonly status: ApplicationStatus
  readonly interviewStage?: InterviewStage
}

export function useApplicationStatus() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, StatusUpdateVariables>({
    mutationFn: ({ slug, status, interviewStage }) =>
      updateApplicationStatusFn({ data: { slug, status, interviewStage } }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.detail(variables.slug),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.all,
      })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: (slug: string) => deleteApplicationFn({ data: slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.applications.all })
      addToast('success', 'Application deleted.')
    },
    onError: (err) => {
      addToast('error', `Failed to delete application: ${err.message}`)
    },
  })
}

export function useApplicationCoach() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, { readonly applicationSlug: string; readonly interviewStage: InterviewStage }>({
    mutationFn: async (variables) => {
      // Stubbed network call for FAKE interaction
      return { success: true, applicationSlug: variables.applicationSlug }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.detail(variables.applicationSlug),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications.all,
      })
    },
  })
}
