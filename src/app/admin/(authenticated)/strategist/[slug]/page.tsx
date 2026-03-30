/**
 * Job Strategist — Application Detail Page
 *
 * Full detail view for a single job application with tabbed content:
 * - Overview: Fit summary, recommendation, cost breakdown, experience signals
 * - Skills: Verified matches, partial matches, gaps, technology inventory
 * - Cover Letter: Generated cover letter with copy/download, resume suggestions
 * - Interview Prep: Stage-specific questions, checklist, coaching notes
 *
 * Route: /admin/strategist/[slug]
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useCallback, use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  Briefcase,
  Clock,
  DollarSign,
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Download,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  BookOpen,
  Plus,
  ArrowRight,
  Pencil,
  ScrollText,
  Send,
} from 'lucide-react'
import { useStrategistDetail } from '@/lib/hooks/use-strategist-detail'
import { useStrategistStatus } from '@/lib/hooks/use-strategist-status'
import { useStrategistCoach } from '@/lib/hooks/use-strategist-coach'
import { useStrategistStore, type StrategistDetailTab } from '@/lib/stores/strategist-store'
import type {
  ApplicationDetail,
  ApplicationStatus,
  FitRating,
  ApplicationRecommendation,
  InterviewStage,
  ResumeSuggestions,
} from '@/lib/types/strategist.types'

// =============================================================================
// CONSTANTS
// =============================================================================

/** Detail page tabs */
const TABS: readonly { id: StrategistDetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: 'Skills Matrix' },
  { id: 'cover-letter', label: 'Cover Letter' },
  { id: 'interview-prep', label: 'Interview Prep' },
]

/** Status transition options */
const STATUS_OPTIONS: readonly { value: ApplicationStatus; label: string }[] = [
  { value: 'analysis-ready', label: 'Analysis Ready' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer-received', label: 'Offer Received' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'rejected', label: 'Rejected' },
]

/** Interview stage labels */
const STAGE_LABELS: Record<InterviewStage, string> = {
  'applied': 'Applied',
  'phone-screen': 'Phone Screen',
  'technical': 'Technical',
  'system-design': 'System Design',
  'behavioural': 'Behavioural',
  'bar-raiser': 'Bar Raiser',
  'final': 'Final',
}

// =============================================================================
// COLOUR MAPS
// =============================================================================

/** Status badge colours */
const STATUS_COLOURS: Record<ApplicationStatus, string> = {
  'analysing': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'analysis-ready': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'coaching': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'interview-prep': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'applied': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'interviewing': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'offer-received': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'accepted': 'bg-green-500/20 text-green-300 border-green-500/30',
  'withdrawn': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  'rejected': 'bg-red-500/20 text-red-300 border-red-500/30',
  'failed': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
}

/** Status labels */
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  'analysing': 'Analysing',
  'analysis-ready': 'Ready',
  'coaching': 'Coaching',
  'interview-prep': 'Interview Prep',
  'applied': 'Applied',
  'interviewing': 'Interviewing',
  'offer-received': 'Offer',
  'accepted': 'Accepted',
  'withdrawn': 'Withdrawn',
  'rejected': 'Rejected',
  'failed': 'Failed',
}

/** Fit rating colours */
const FIT_COLOURS: Record<FitRating, string> = {
  'STRONG_FIT': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  'REASONABLE_FIT': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  'STRETCH': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  'REACH': 'text-red-400 border-red-500/30 bg-red-500/10',
}

/** Fit rating labels */
const FIT_LABELS: Record<FitRating, string> = {
  'STRONG_FIT': 'Strong Fit',
  'REASONABLE_FIT': 'Reasonable Fit',
  'STRETCH': 'Stretch',
  'REACH': 'Reach',
}

/** Recommendation colours */
const REC_COLOURS: Record<ApplicationRecommendation, string> = {
  'APPLY': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'APPLY_WITH_CAVEATS': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'STRETCH_APPLICATION': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  'NOT_RECOMMENDED': 'border-red-500/30 bg-red-500/10 text-red-300',
}

/** Recommendation labels */
const REC_LABELS: Record<ApplicationRecommendation, string> = {
  'APPLY': 'Recommended: Apply',
  'APPLY_WITH_CAVEATS': 'Apply with Caveats',
  'STRETCH_APPLICATION': 'Stretch Application',
  'NOT_RECOMMENDED': 'Not Recommended',
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Section heading component.
 *
 * @param props - Component props
 * @param props.title - Section title
 * @param props.subtitle - Optional subtitle
 * @returns Section heading JSX
 */
function SectionHeading({ title, subtitle }: { readonly title: string; readonly subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  )
}

/**
 * Renders a stat card with icon, label, and value.
 *
 * @param props - Component props
 * @returns Stat card JSX
 */
function StatCard({
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

// =============================================================================
// TAB CONTENT COMPONENTS
// =============================================================================

/**
 * Overview tab — fit summary, recommendation, cost, experience signals.
 *
 * @param props - Component props
 * @param props.detail - Application detail
 * @returns Overview tab JSX
 */
function OverviewTab({ detail }: { readonly detail: ApplicationDetail }) {
  const researchData = detail.research
  const analysisData = detail.analysis

  return (
    <div className="space-y-6">
      {/* Recommendation banner */}
      {analysisData?.metadata && (
        <div
          className={`rounded-xl border p-4 ${REC_COLOURS[analysisData.metadata.applicationRecommendation]}`}
        >
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5" />
            <span className="text-base font-semibold">
              {REC_LABELS[analysisData.metadata.applicationRecommendation]}
            </span>
          </div>
        </div>
      )}

      {/* Fit summary */}
      {researchData && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Fit Summary" />
          <p className="text-sm leading-relaxed text-zinc-300">
            {researchData.fitSummary}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pipeline Cost"
          value={`$${detail.context.cumulativeCostUsd.toFixed(4)}`}
          icon={DollarSign}
          colour="text-emerald-400"
        />
        <StatCard
          label="Input Tokens"
          value={detail.context.cumulativeInputTokens.toLocaleString()}
          icon={BookOpen}
          colour="text-sky-400"
        />
        <StatCard
          label="Output Tokens"
          value={detail.context.cumulativeOutputTokens.toLocaleString()}
          icon={MessageSquare}
          colour="text-amber-400"
        />
        <StatCard
          label="Thinking Tokens"
          value={detail.context.cumulativeThinkingTokens.toLocaleString()}
          icon={Lightbulb}
          colour="text-violet-400"
        />
      </div>

      {/* Experience signals */}
      {researchData?.experienceSignals && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Experience Signals" />
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['Years Expected', researchData.experienceSignals.yearsExpected],
              ['Domain', researchData.experienceSignals.domain],
              ['Leadership', researchData.experienceSignals.leadership],
              ['Scale', researchData.experienceSignals.scale],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-zinc-500">{label}:</span>
                <span className="text-sm text-zinc-300">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Skills Matrix tab — verified matches, partial matches, gaps, technology inventory.
 *
 * @param props - Component props
 * @param props.detail - Application detail
 * @returns Skills tab JSX
 */
function SkillsTab({ detail }: { readonly detail: ApplicationDetail }) {
  const research = detail.research

  if (!research) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-400" />
        <p>Skills analysis in progress…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Verified Matches */}
      {research.verifiedMatches.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading
            title="Verified Matches"
            subtitle={`${research.verifiedMatches.length} skills confirmed`}
          />
          <div className="space-y-3">
            {research.verifiedMatches.map((match) => (
              <div
                key={match.skill}
                className="flex items-start gap-3 rounded-lg border border-emerald-500/20
                           bg-emerald-500/5 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-emerald-300">
                    {match.skill}
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {match.sourceCitation}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <span className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400">
                      {match.depthBadge}
                    </span>
                    <span className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400">
                      {match.recency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partial Matches */}
      {research.partialMatches.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading
            title="Partial Matches"
            subtitle={`${research.partialMatches.length} skills with gaps`}
          />
          <div className="space-y-3">
            {research.partialMatches.map((match) => (
              <div
                key={match.skill}
                className="flex items-start gap-3 rounded-lg border border-amber-500/20
                           bg-amber-500/5 p-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-amber-300">
                    {match.skill}
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {match.gapDescription}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="text-zinc-400">Framing:</span>{' '}
                    {match.framingSuggestion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {research.gaps.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading
            title="Skills Gaps"
            subtitle={`${research.gaps.length} identified gaps`}
          />
          <div className="space-y-3">
            {research.gaps.map((gap) => (
              <div
                key={gap.skill}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  gap.isDisqualifying
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-zinc-700/50 bg-zinc-800/20'
                }`}
              >
                <XCircle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    gap.isDisqualifying ? 'text-red-400' : 'text-zinc-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        gap.isDisqualifying ? 'text-red-300' : 'text-zinc-300'
                      }`}
                    >
                      {gap.skill}
                    </span>
                    {gap.isDisqualifying && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-400">
                        Disqualifying
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{gap.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technology Inventory */}
      {research.technologyInventory && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Technology Inventory" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Languages', research.technologyInventory.languages],
              ['Frameworks', research.technologyInventory.frameworks],
              ['Infrastructure', research.technologyInventory.infrastructure],
              ['Tools', research.technologyInventory.tools],
              ['Methodologies', research.technologyInventory.methodologies],
            ] as const).map(([category, items]) =>
              items.length > 0 ? (
                <div key={category}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Cover Letter tab — generated cover letter with copy/download and resume suggestions.
 *
 * @param props - Component props
 * @param props.detail - Application detail
 * @returns Cover letter tab JSX
 */
function CoverLetterTab({ detail }: { readonly detail: ApplicationDetail }) {
  const analysis = detail.analysis
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (analysis?.coverLetter) {
      await navigator.clipboard.writeText(analysis.coverLetter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    }
  }, [analysis?.coverLetter])

  const handleDownload = useCallback(() => {
    if (!analysis?.coverLetter) return
    const blob = new Blob([analysis.coverLetter], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cover-letter-${detail.slug}.md`
    link.click()
    URL.revokeObjectURL(url)
  }, [analysis?.coverLetter, detail.slug])

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-400" />
        <p>Cover letter generation in progress…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Cover Letter ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-zinc-900 to-zinc-900 shadow-lg shadow-violet-500/5">
        <div className="flex items-center justify-between border-b border-violet-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20">
              <ScrollText className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Generated Cover Letter
              </h3>
              <p className="text-xs text-zinc-500">
                Tailored to {detail.targetCompany} — {detail.targetRole}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium
                transition-all ${
                  copied
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800
                         px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="rounded-xl border border-zinc-700/30 bg-zinc-950/50 p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-zinc-200">
              {analysis.coverLetter}
            </pre>
          </div>
        </div>
      </div>

      {/* ── Resume Suggestions ───────────────────────────────────────── */}
      {analysis.resumeSuggestions && (
        <ResumeSuggestionsPanel suggestions={analysis.resumeSuggestions} />
      )}
    </div>
  )
}

/**
 * Renders structured resume suggestions with per-item detail panels,
 * falling back to count-only badges when item arrays are absent.
 *
 * @param props - Component props
 * @param props.suggestions - Resume suggestions data
 * @returns Suggestions panel JSX
 */
function ResumeSuggestionsPanel({ suggestions }: { readonly suggestions: ResumeSuggestions }) {
  const hasAdditionItems = suggestions.additionItems && suggestions.additionItems.length > 0
  const hasReframeItems = suggestions.reframeItems && suggestions.reframeItems.length > 0
  const hasEslItems = suggestions.eslCorrectionItems && suggestions.eslCorrectionItems.length > 0
  const hasStructuredData = hasAdditionItems || hasReframeItems || hasEslItems

  return (
    <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/40">
      <div className="border-b border-zinc-700/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
            <Pencil className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Resume Suggestions</h3>
            <p className="text-xs text-zinc-500">
              AI-recommended improvements to strengthen your application
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Summary stat cards — always shown */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Additions"
            value={String(suggestions.additions)}
            icon={Plus}
            colour="text-emerald-400"
          />
          <StatCard
            label="Reframes"
            value={String(suggestions.reframes)}
            icon={Lightbulb}
            colour="text-amber-400"
          />
          <StatCard
            label="ESL Corrections"
            value={String(suggestions.eslCorrections)}
            icon={GraduationCap}
            colour="text-sky-400"
          />
        </div>

        {/* Summary text */}
        {suggestions.summary && (
          <p className="mt-4 rounded-lg bg-zinc-900/50 p-3 text-sm leading-relaxed text-zinc-400">
            {suggestions.summary}
          </p>
        )}

        {/* Structured suggestion items — shown when pipeline populates them */}
        {hasStructuredData && (
          <div className="mt-6 space-y-5">
            {/* Addition items */}
            {hasAdditionItems && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Plus className="h-3.5 w-3.5" />
                  Suggested Additions
                </h4>
                <div className="space-y-2">
                  {suggestions.additionItems!.map((item, idx) => (
                    <div
                      key={`add-${String(idx)}`}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
                    >
                      <span className="inline-flex rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        {item.section}
                      </span>
                      <p className="mt-2 text-sm text-zinc-200">{item.suggestedBullet}</p>
                      {item.sourceCitation && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-zinc-500">
                          <BookOpen className="h-3 w-3" />
                          {item.sourceCitation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reframe items */}
            {hasReframeItems && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Suggested Reframes
                </h4>
                <div className="space-y-2">
                  {suggestions.reframeItems!.map((item, idx) => (
                    <div
                      key={`reframe-${String(idx)}`}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
                    >
                      <span className="inline-flex rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                        {item.section}
                      </span>
                      <div className="mt-2 space-y-2">
                        <div className="rounded-md bg-red-500/5 px-3 py-2">
                          <span className="text-xs font-medium text-red-400">Original</span>
                          <p className="mt-0.5 text-sm text-zinc-400 line-through">{item.original}</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
                        </div>
                        <div className="rounded-md bg-emerald-500/5 px-3 py-2">
                          <span className="text-xs font-medium text-emerald-400">Suggested</span>
                          <p className="mt-0.5 text-sm text-zinc-200">{item.suggested}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        <span className="font-medium text-amber-400">Rationale:</span> {item.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ESL Correction items */}
            {hasEslItems && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
                  <GraduationCap className="h-3.5 w-3.5" />
                  ESL Corrections
                </h4>
                <div className="space-y-2">
                  {suggestions.eslCorrectionItems!.map((item, idx) => (
                    <div
                      key={`esl-${String(idx)}`}
                      className="flex items-start gap-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-400 line-through">{item.original}</p>
                      </div>
                      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-sky-200">{item.corrected}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Interview Prep tab — stage-specific questions, checklist, coaching notes.
 *
 * @param props - Component props
 * @param props.detail - Application detail
 * @returns Interview prep tab JSX
 */
function InterviewPrepTab({ detail }: { readonly detail: ApplicationDetail }) {
  const prep = detail.interviewPrep
  const coach = useStrategistCoach()
  const [coachStage, setCoachStage] = useState<InterviewStage>('phone-screen')

  const handleStartPrep = useCallback(() => {
    coach.mutate({
      applicationSlug: detail.slug,
      interviewStage: coachStage,
    })
  }, [coach, detail.slug, coachStage])

  if (!prep) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-zinc-900 to-zinc-900 p-8 text-center shadow-lg shadow-sky-500/5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20">
            <GraduationCap className="h-7 w-7 text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">
            Prepare for Interview
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Select the interview stage you&apos;ve been invited to.
            The Coach agent will generate stage-specific preparation materials.
          </p>

          <div className="mt-6">
            <label htmlFor="coach-stage" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Interview Stage
            </label>
            <select
              id="coach-stage"
              value={coachStage}
              onChange={(e) => setCoachStage(e.target.value as InterviewStage)}
              className="mx-auto w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm
                         text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="phone-screen">Phone Screen</option>
              <option value="technical">Technical Round</option>
              <option value="system-design">System Design</option>
              <option value="behavioural">Behavioural</option>
              <option value="bar-raiser">Bar Raiser</option>
              <option value="final">Final Round</option>
            </select>
          </div>

          {coach.error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {coach.error.message}
            </div>
          )}

          <button
            type="button"
            onClick={handleStartPrep}
            disabled={coach.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm
                       font-medium text-white transition-all hover:bg-sky-500
                       hover:shadow-lg hover:shadow-sky-500/20
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {coach.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {coach.isPending ? 'Starting Coach…' : 'Start Preparation'}
          </button>

          {coach.isPending && (
            <p className="mt-3 text-xs text-zinc-600">
              The Coach agent is loading your application context…
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stage header */}
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-5 w-5 text-sky-400" />
          <div>
            <span className="text-sm font-semibold text-sky-300">
              {prep.stageDescription}
            </span>
            <p className="text-xs text-sky-400/70">
              Stage: {STAGE_LABELS[prep.stage]}
            </p>
          </div>
        </div>
      </div>

      {/* Technical questions */}
      {prep.technicalQuestions.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading
            title="Technical Questions"
            subtitle={`${prep.technicalQuestions.length} questions`}
          />
          <div className="space-y-3">
            {prep.technicalQuestions.map((q, idx) => (
              <div
                key={`tech-${String(idx)}`}
                className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-4"
              >
                <p className="text-sm font-medium text-zinc-200">{q.question}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-xs text-zinc-400">
                    {q.difficulty}
                  </span>
                  {q.sourceProject && (
                    <span className="text-xs text-zinc-500">
                      <ChevronRight className="inline h-3 w-3" />
                      {q.sourceProject}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500">{q.answerFramework}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Behavioural questions */}
      {prep.behaviouralQuestions.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading
            title="Behavioural Questions"
            subtitle={`${prep.behaviouralQuestions.length} questions`}
          />
          <div className="space-y-3">
            {prep.behaviouralQuestions.map((q, idx) => (
              <div
                key={`behav-${String(idx)}`}
                className="rounded-lg border border-zinc-700/30 bg-zinc-900/30 p-4"
              >
                <p className="text-sm font-medium text-zinc-200">{q.question}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-xs text-zinc-400">
                    {q.difficulty}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{q.answerFramework}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficult questions */}
      {prep.difficultQuestions.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Difficult Questions" subtitle="Bridge strategies included" />
          <div className="space-y-3">
            {prep.difficultQuestions.map((q, idx) => (
              <div
                key={`diff-${String(idx)}`}
                className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4"
              >
                <p className="text-sm font-medium text-orange-200">{q.question}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  <span className="font-medium text-orange-300">Bridge:</span>{' '}
                  {q.bridgeStrategy}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{q.answerFramework}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical prep checklist */}
      {prep.technicalPrepChecklist.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Preparation Checklist" />
          <div className="space-y-2">
            {prep.technicalPrepChecklist.map((item) => (
              <div
                key={item.topic}
                className="flex items-start gap-3 rounded-lg border border-zinc-700/30
                           bg-zinc-900/30 p-3"
              >
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-zinc-600">
                  <span className="text-xs text-zinc-500">
                    {item.priority === 'high' ? '!' : '·'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-zinc-200">{item.topic}</span>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions to ask */}
      {prep.questionsToAsk.length > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Questions to Ask" />
          <div className="space-y-2">
            {prep.questionsToAsk.map((q) => (
              <div key={q.question} className="flex items-start gap-3 py-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div>
                  <p className="text-sm text-zinc-200">{q.question}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{q.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coaching notes */}
      {prep.coachingNotes && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5">
          <SectionHeading title="Coaching Notes" />
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
            {prep.coachingNotes}
          </pre>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/** Route params for dynamic [slug] pages */
interface PageProps {
  readonly params: Promise<{ slug: string }>
}

/**
 * Application detail page — tabbed view with status controls.
 *
 * @param props - Page props with slug param
 * @returns Detail page JSX
 */
export default function StrategistDetailPage(props: PageProps) {
  const { slug } = use(props.params)
  const router = useRouter()
  const statusMutation = useStrategistStatus()

  // Zustand UI state
  const activeTab = useStrategistStore((s) => s.activeDetailTab)
  const setActiveTab = useStrategistStore((s) => s.setDetailTab)

  // TanStack Query data
  const { data: detail, isLoading, error } = useStrategistDetail(slug)

  const handleStatusChange = useCallback(
    (newStatus: ApplicationStatus) => {
      statusMutation.mutate({ slug, status: newStatus })
    },
    [slug, statusMutation],
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push('/admin/strategist')}
          className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error.message}</span>
        </div>
      </div>
    )
  }

  if (!detail) return null

  const dateStr = new Date(detail.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push('/admin/strategist')}
        className="mb-6 flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </button>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-zinc-400" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                {detail.targetCompany}
              </h1>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-zinc-500" />
              <span className="text-base text-zinc-400">{detail.targetRole}</span>
            </div>
          </div>

          {/* Status and actions */}
          <div className="flex items-center gap-3">
            <select
              id="status-change"
              value={detail.status}
              onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
              disabled={statusMutation.isPending}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm
                         text-zinc-100 focus:border-violet-500 focus:outline-none
                         focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOURS[detail.status]}`}
          >
            {detail.status === 'analysing' && (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            )}
            {STATUS_LABELS[detail.status]}
          </span>

          {detail.research?.fitRating && (
            <span
              className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${FIT_COLOURS[detail.research.fitRating]}`}
            >
              {FIT_LABELS[detail.research.fitRating]}
            </span>
          )}

          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <GraduationCap className="h-3.5 w-3.5" />
            {STAGE_LABELS[detail.interviewStage]}
          </span>

          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            {dateStr}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-zinc-700/50">
        <nav className="-mb-px flex gap-6" aria-label="Application detail tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pb-16">
        {activeTab === 'overview' && <OverviewTab detail={detail} />}
        {activeTab === 'skills' && <SkillsTab detail={detail} />}
        {activeTab === 'cover-letter' && <CoverLetterTab detail={detail} />}
        {activeTab === 'interview-prep' && <InterviewPrepTab detail={detail} />}
      </div>
    </div>
  )
}
