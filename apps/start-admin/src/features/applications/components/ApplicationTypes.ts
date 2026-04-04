import type {
  ApplicationStatus,
  FitRating,
  ApplicationRecommendation,
  InterviewStage,
} from '@/lib/types/applications.types'

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUS_FILTER_OPTIONS: readonly { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Applications' },
  { value: 'analysing', label: 'Analysing' },
  { value: 'analysis-ready', label: 'Analysis Ready' },
  { value: 'failed', label: 'Failed' },
  { value: 'interview-prep', label: 'Interview Prep' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer-received', label: 'Offer Received' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'rejected', label: 'Rejected' },
]

export const INTERVIEW_STAGE_OPTIONS: readonly { value: InterviewStage; label: string }[] = [
  { value: 'applied', label: 'Just Applied' },
  { value: 'phone-screen', label: 'Phone Screen' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'system-design', label: 'System Design' },
  { value: 'behavioural', label: 'Behavioural' },
  { value: 'bar-raiser', label: 'Bar Raiser' },
  { value: 'final', label: 'Final Round' },
]

export const MIN_JD_LENGTH = 50

// =============================================================================
// COLOUR MAPS
// =============================================================================

export const STATUS_COLOURS: Record<ApplicationStatus, string> = {
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

export const FIT_RATING_COLOURS: Record<FitRating, string> = {
  'STRONG_FIT': 'bg-emerald-500/20 text-emerald-300',
  'REASONABLE_FIT': 'bg-amber-500/20 text-amber-300',
  'STRETCH': 'bg-orange-500/20 text-orange-300',
  'REACH': 'bg-red-500/20 text-red-300',
}

export const FIT_RATING_LABELS: Record<FitRating, string> = {
  'STRONG_FIT': 'Strong Fit',
  'REASONABLE_FIT': 'Reasonable Fit',
  'STRETCH': 'Stretch',
  'REACH': 'Reach',
}

export const RECOMMENDATION_LABELS: Record<ApplicationRecommendation, string> = {
  'APPLY': 'Apply',
  'APPLY_WITH_CAVEATS': 'Apply with Caveats',
  'STRETCH_APPLICATION': 'Stretch Application',
  'NOT_RECOMMENDED': 'Not Recommended',
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
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

export const STAGE_LABELS: Record<InterviewStage, string> = {
  'applied': 'Applied',
  'phone-screen': 'Phone Screen',
  'technical': 'Technical',
  'system-design': 'System Design',
  'behavioural': 'Behavioural',
  'bar-raiser': 'Bar Raiser',
  'final': 'Final',
}

export const REC_COLOURS: Record<ApplicationRecommendation, string> = {
  'APPLY': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'APPLY_WITH_CAVEATS': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'STRETCH_APPLICATION': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  'NOT_RECOMMENDED': 'border-red-500/30 bg-red-500/10 text-red-300',
}

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'analysing', label: 'Analysing' },
  { value: 'analysis-ready', label: 'Ready for Review' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview-prep', label: 'Interview Prep' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer-received', label: 'Offer Received' },
  { value: 'accepted', label: 'Accepted Offer' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'rejected', label: 'Rejected' },
]
