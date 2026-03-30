/**
 * Job Strategist — Applications Dashboard
 *
 * Main listing page for all job applications analysed by the
 * Strategist pipeline. Features:
 * - Inline "New Analysis" panel to paste a JD and trigger the pipeline
 * - Status-filtered listing with colour-coded badges
 * - Fit rating chips with semantic colouring
 * - Auto-polling for 'analysing' entries
 * - Company name search
 *
 * Route: /admin/strategist
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  Plus,
  Search,
  Loader2,
  Building2,
  Briefcase,
  Clock,
  DollarSign,
  Send,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  ScrollText,
} from 'lucide-react'
import { useStrategistApplications } from '@/lib/hooks/use-strategist-applications'
import { useStrategistTrigger } from '@/lib/hooks/use-strategist-trigger'
import { useResumeVersions } from '@/lib/hooks/use-resume-versions'
import { useStrategistStore } from '@/lib/stores/strategist-store'
import type {
  ApplicationSummary,
  ApplicationStatus,
  FitRating,
  ApplicationRecommendation,
  InterviewStage,
} from '@/lib/types/strategist.types'

// =============================================================================
// CONSTANTS
// =============================================================================

/** Status filter options for the dashboard dropdown */
const STATUS_FILTER_OPTIONS: readonly { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Applications' },
  { value: 'analysing', label: 'Analysing' },
  { value: 'analysis-ready', label: 'Analysis Ready' },
  { value: 'interview-prep', label: 'Interview Prep' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer-received', label: 'Offer Received' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'rejected', label: 'Rejected' },
]

/** Interview stage options for the new analysis form */
const INTERVIEW_STAGE_OPTIONS: readonly { value: InterviewStage; label: string }[] = [
  { value: 'applied', label: 'Just Applied' },
  { value: 'phone-screen', label: 'Phone Screen' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'system-design', label: 'System Design' },
  { value: 'behavioural', label: 'Behavioural' },
  { value: 'bar-raiser', label: 'Bar Raiser' },
  { value: 'final', label: 'Final Round' },
]

/** Minimum character count for job description textarea */
const MIN_JD_LENGTH = 50

// =============================================================================
// COLOUR MAPS
// =============================================================================

/** Maps application status to Tailwind colour classes */
const STATUS_COLOURS: Record<ApplicationStatus, string> = {
  'analysing': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'analysis-ready': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'interview-prep': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'applied': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'interviewing': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'offer-received': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'accepted': 'bg-green-500/20 text-green-300 border-green-500/30',
  'withdrawn': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  'rejected': 'bg-red-500/20 text-red-300 border-red-500/30',
}

/** Maps fit rating to Tailwind colour classes */
const FIT_RATING_COLOURS: Record<FitRating, string> = {
  'STRONG_FIT': 'bg-emerald-500/20 text-emerald-300',
  'REASONABLE_FIT': 'bg-amber-500/20 text-amber-300',
  'STRETCH': 'bg-orange-500/20 text-orange-300',
  'REACH': 'bg-red-500/20 text-red-300',
}

/** Human-readable fit rating labels */
const FIT_RATING_LABELS: Record<FitRating, string> = {
  'STRONG_FIT': 'Strong Fit',
  'REASONABLE_FIT': 'Reasonable Fit',
  'STRETCH': 'Stretch',
  'REACH': 'Reach',
}

/** Human-readable recommendation labels */
const RECOMMENDATION_LABELS: Record<ApplicationRecommendation, string> = {
  'APPLY': 'Apply',
  'APPLY_WITH_CAVEATS': 'Apply with Caveats',
  'STRETCH_APPLICATION': 'Stretch Application',
  'NOT_RECOMMENDED': 'Not Recommended',
}

/** Human-readable status labels */
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  'analysing': 'Analysing',
  'analysis-ready': 'Ready',
  'interview-prep': 'Interview Prep',
  'applied': 'Applied',
  'interviewing': 'Interviewing',
  'offer-received': 'Offer',
  'accepted': 'Accepted',
  'withdrawn': 'Withdrawn',
  'rejected': 'Rejected',
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Colour-coded status badge pill.
 *
 * @param props - Component props
 * @param props.status - Application status
 * @returns Status badge JSX
 */
function StatusBadge({ status }: { readonly status: ApplicationStatus }) {
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

/**
 * Colour-coded fit rating chip.
 *
 * @param props - Component props
 * @param props.rating - Fit rating value
 * @returns Fit rating chip JSX
 */
function FitRatingChip({ rating }: { readonly rating: FitRating }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${FIT_RATING_COLOURS[rating]}`}
    >
      {FIT_RATING_LABELS[rating]}
    </span>
  )
}

/**
 * Application card for the dashboard listing.
 * Navigates to the detail page on click.
 *
 * @param props - Component props
 * @param props.app - Application summary data
 * @param props.onClick - Click handler
 * @returns Application card JSX
 */
function ApplicationCard({
  app,
  onClick,
}: {
  readonly app: ApplicationSummary
  readonly onClick: () => void
}) {
  const dateStr = new Date(app.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-5
                 text-left transition-all duration-200 hover:border-violet-500/40
                 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-violet-500/5"
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-zinc-400" />
            <h3 className="truncate text-sm font-semibold text-zinc-100">
              {app.targetCompany}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <p className="truncate text-xs text-zinc-400">{app.targetRole}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-violet-400" />
      </div>

      {/* Badges row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={app.status} />
        {app.fitRating && <FitRatingChip rating={app.fitRating} />}
        {app.recommendation && (
          <span className="text-xs text-zinc-500">
            {RECOMMENDATION_LABELS[app.recommendation]}
          </span>
        )}
      </div>

      {/* Footer row */}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {dateStr}
        </span>
        {app.costUsd !== undefined && app.costUsd > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${app.costUsd.toFixed(4)}
          </span>
        )}
      </div>
    </button>
  )
}

// =============================================================================
// NEW ANALYSIS PANEL (INLINE)
// =============================================================================

/**
 * Inline collapsible panel for submitting a new job description.
 * Always visible on the page — no hidden modal required.
 *
 * Features:
 * - Company/role inputs, interview stage selector
 * - Large job description textarea with character counter
 * - Success auto-collapse after pipeline trigger
 * - Gradient accent border for visual prominence
 *
 * @param props - Component props
 * @param props.isExpanded - Whether the panel is expanded
 * @param props.onToggle - Toggle handler
 * @returns New analysis panel JSX
 */
function NewAnalysisPanel({
  isExpanded,
  onToggle,
}: {
  readonly isExpanded: boolean
  readonly onToggle: () => void
}) {
  const trigger = useStrategistTrigger()
  const { data: resumeVersions, isLoading: resumesLoading } = useResumeVersions()
  const [jobDescription, setJobDescription] = useState('')
  const [targetCompany, setTargetCompany] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [interviewStage, setInterviewStage] = useState<InterviewStage>('applied')
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')

  // Pre-select the active resume when versions load
  const activeResume = resumeVersions?.find((r) => r.isActive)
  const effectiveResumeId = selectedResumeId || activeResume?.resumeId || ''

  const isValid =
    jobDescription.length >= MIN_JD_LENGTH &&
    targetCompany.trim().length > 0 &&
    targetRole.trim().length > 0

  const handleSubmit = useCallback(() => {
    if (!isValid) return
    trigger.mutate(
      {
        jobDescription,
        targetCompany: targetCompany.trim(),
        targetRole: targetRole.trim(),
        interviewStage,
        resumeId: effectiveResumeId || undefined,
      },
      {
        onSuccess: () => {
          setJobDescription('')
          setTargetCompany('')
          setTargetRole('')
          setInterviewStage('applied')
          setSelectedResumeId('')
          onToggle()
        },
      },
    )
  }, [isValid, jobDescription, targetCompany, targetRole, interviewStage, effectiveResumeId, trigger, onToggle])

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-zinc-900 to-zinc-900 shadow-lg shadow-violet-500/5">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left
                   transition-colors hover:bg-violet-500/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Analyse New Job Description
            </h2>
            <p className="text-xs text-zinc-500">
              Paste a job description to analyse against your resume
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="rounded-md bg-violet-600/20 px-2.5 py-1 text-xs font-medium text-violet-400">
              Paste JD
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="border-t border-violet-500/10 px-6 pb-6 pt-5">
          {/* Feature description */}
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-violet-500/5 p-4">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
            <div className="text-sm text-zinc-400">
              <p className="font-medium text-zinc-300">Analyse Resume Against Job Description</p>
              <p className="mt-1 leading-relaxed">
                Paste the full job description and select a resume version. The Research agent
                identifies skill matches and gaps. The Strategist agent generates a tailored
                cover letter and suggests resume improvements.
              </p>
            </div>
          </div>

          {/* Company + Role row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="target-company" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Target Company
              </label>
              <input
                id="target-company"
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Revolut"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm
                           text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500
                           focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label htmlFor="target-role" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Target Role
              </label>
              <input
                id="target-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior DevOps Engineer"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm
                           text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500
                           focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Interview Stage + Resume Version row */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="interview-stage" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Interview Stage
              </label>
              <select
                id="interview-stage"
                value={interviewStage}
                onChange={(e) => setInterviewStage(e.target.value as InterviewStage)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm
                           text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1
                           focus:ring-violet-500"
              >
                {INTERVIEW_STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="resume-version" className="mb-1.5 block text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" />
                  Resume Version
                </span>
              </label>
              {resumesLoading ? (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading resumes…
                </div>
              ) : (
                <select
                  id="resume-version"
                  value={effectiveResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm
                             text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1
                             focus:ring-violet-500"
                >
                  {resumeVersions?.map((r) => (
                    <option key={r.resumeId} value={r.resumeId}>
                      {r.isActive ? '● ' : ''}{r.label}{r.isActive ? ' (Active)' : ''}
                    </option>
                  ))}
                  {(!resumeVersions || resumeVersions.length === 0) && (
                    <option value="" disabled>No resumes available</option>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Job Description textarea */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="job-description" className="text-xs font-medium text-zinc-400">
                Job Description
              </label>
              <span
                className={`text-xs ${
                  jobDescription.length >= MIN_JD_LENGTH ? 'text-emerald-500' : 'text-zinc-600'
                }`}
              >
                {jobDescription.length} / {MIN_JD_LENGTH} min characters
              </span>
            </div>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here. Include responsibilities, requirements, qualifications, and any other relevant details…"
              rows={12}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm
                         leading-relaxed text-zinc-100 placeholder:text-zinc-600
                         focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Error */}
          {trigger.error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {trigger.error.message}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {isValid
                ? '✓ Ready to analyse'
                : 'Fill in company, role, and a job description (min 50 chars)'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400
                           hover:bg-zinc-800 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || trigger.isPending}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm
                           font-medium text-white transition-all hover:bg-violet-500
                           hover:shadow-lg hover:shadow-violet-500/20
                           disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
              >
                {trigger.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {trigger.isPending ? 'Analysing…' : 'Start Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Strategist applications dashboard — main listing page.
 * Fetches applications via TanStack Query with auto-polling.
 *
 * @returns Dashboard page JSX
 */
export default function StrategistDashboardPage() {
  const router = useRouter()

  // Zustand UI state
  const statusFilter = useStrategistStore((s) => s.activeStatusFilter)
  const setStatusFilter = useStrategistStore((s) => s.setStatusFilter)
  const searchQuery = useStrategistStore((s) => s.searchQuery)
  const setSearchQuery = useStrategistStore((s) => s.setSearchQuery)
  const isNewAnalysisOpen = useStrategistStore((s) => s.isNewAnalysisOpen)
  const openNewAnalysis = useStrategistStore((s) => s.openNewAnalysis)
  const closeNewAnalysis = useStrategistStore((s) => s.closeNewAnalysis)

  /** Toggle the new analysis panel */
  const toggleAnalysisPanel = useCallback(() => {
    if (isNewAnalysisOpen) {
      closeNewAnalysis()
    } else {
      openNewAnalysis()
    }
  }, [isNewAnalysisOpen, openNewAnalysis, closeNewAnalysis])

  // TanStack Query data
  const {
    data: applications,
    isLoading,
    error,
  } = useStrategistApplications(statusFilter)

  // Client-side company name filter
  const filteredApps = applications?.filter((app) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      app.targetCompany.toLowerCase().includes(query) ||
      app.targetRole.toLowerCase().includes(query)
    )
  })

  // Derived counts
  const totalCount = applications?.length ?? 0
  const analysingCount = applications?.filter((a) => a.status === 'analysing').length ?? 0

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
              <Target className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Job Strategist
              </h1>
              <p className="mt-0.5 text-sm text-zinc-400">
                AI-powered job application analysis & interview preparation
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
            <span>{totalCount} application{totalCount !== 1 ? 's' : ''}</span>
            {analysingCount > 0 && (
              <span className="flex items-center gap-1 text-violet-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {analysingCount} analysing
              </span>
            )}
          </div>
        </div>
        {!isNewAnalysisOpen && (
          <button
            type="button"
            onClick={openNewAnalysis}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm
                       font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            New Analysis
          </button>
        )}
      </div>

      {/* New Analysis Panel (inline, collapsible) */}
      <NewAnalysisPanel isExpanded={isNewAnalysisOpen} onToggle={toggleAnalysisPanel} />

      {/* Filters row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status filter */}
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm
                     text-zinc-100 focus:border-violet-500 focus:outline-none
                     focus:ring-1 focus:ring-violet-500"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="company-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or role…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3
                       text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500
                       focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Failed to load applications: {error.message}</span>
        </div>
      )}

      {!isLoading && !error && filteredApps?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="mb-4 h-12 w-12 text-zinc-700" />
          <h3 className="text-lg font-medium text-zinc-400">
            No applications found
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Start by analysing a new job description above'}
          </p>
          {!searchQuery && !isNewAnalysisOpen && (
            <button
              type="button"
              onClick={openNewAnalysis}
              className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600/20 px-4 py-2
                         text-sm font-medium text-violet-400 hover:bg-violet-600/30"
            >
              <Plus className="h-4 w-4" />
              New Analysis
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && filteredApps && filteredApps.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => (
            <ApplicationCard
              key={app.slug}
              app={app}
              onClick={() => router.push(`/admin/strategist/${app.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
