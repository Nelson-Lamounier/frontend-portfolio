import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  Briefcase,
  Clock,
  GraduationCap,
} from 'lucide-react'
import { useApplicationDetail } from '@/lib/hooks/use-application-detail'
import { useApplicationStatus } from '@/lib/hooks/use-application-status'
import type { ApplicationStatus } from '@/lib/types/applications.types'
import {
  OverviewTab,
  SkillsTab,
  TailoredResumeTab,
  CoverLetterTab,
} from './ApplicationDetailTabs'
import { ApplicationReviewDetail } from './ApplicationReviewDetail'
import { ResumePreviewDrawer } from '../../resumes/components/ResumePreviewDrawer'
import DropDownOptions from '../../../components/ui/DropDownOptions'
import type { AdminResumeWithData } from '@/lib/api/admin-api'
import {
  STATUS_OPTIONS,
  STATUS_COLOURS,
  STATUS_LABELS,
  STAGE_LABELS,
  FIT_RATING_COLOURS,
  FIT_RATING_LABELS,
} from './ApplicationTypes'



export function ApplicationDetailContainer({ slug }: { readonly slug: string }) {
  const navigate = useNavigate()
  const statusMutation = useApplicationStatus()


  // TanStack Query data
  const { data: detail, isLoading, error } = useApplicationDetail(slug)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleStatusChange = useCallback(
    (newStatus: ApplicationStatus) => {
      statusMutation.mutate({ slug, status: newStatus })
    },
    [slug, statusMutation],
  )

  const handleDownloadPreview = useCallback(() => {
    setIsDownloading(true)
    // Add real PDF download logic here if needed
    setTimeout(() => setIsDownloading(false), 1000)
  }, [])

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
          onClick={() => navigate({ to: '/applications/list' })}
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
        onClick={() => navigate({ to: '/applications/list' })}
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
            <DropDownOptions
              onEditResume={() => console.log('Edit resume')}
              onEditCoverLetter={() => console.log('Edit cover letter')}
              showPreviewResume={!!detail.analysis?.tailoredResume}
              onPreviewResume={() => setIsPreviewOpen(true)}
              showPreviewCoverLetter={!!detail.analysis?.coverLetter}
              onPreviewCoverLetter={() => console.log('Preview cover letter')}
              onPublish={() => console.log('Publish application')}
              onDelete={() => console.log('Delete application')}
            />
            <DropDownOptions
              label={STATUS_LABELS[detail.status]}
              disabled={statusMutation.isPending}
              options={STATUS_OPTIONS}
              selectedValue={detail.status}
              onSelect={(val) => handleStatusChange(val as ApplicationStatus)}
            />
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
              className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${FIT_RATING_COLOURS[detail.research.fitRating]}`}
            >
              {FIT_RATING_LABELS[detail.research.fitRating]}
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

      <div className="mt-8 space-y-12">
        <ApplicationReviewDetail detail={detail} />
        
        {/* Render previously tabbed content vertically */}
        <div className="space-y-12">
          <section>
            <h2 className="mb-6 text-xl font-bold text-zinc-100">Overview</h2>
            <OverviewTab detail={detail} />
          </section>

          <section>
            <h2 className="mb-6 text-xl font-bold text-zinc-100">Skills Matrix</h2>
            <SkillsTab detail={detail} />
          </section>

          <section>
            <h2 className="mb-6 text-xl font-bold text-zinc-100">Tailored Resume</h2>
            <TailoredResumeTab detail={detail} />
          </section>

          {detail.analysis?.coverLetter && (
            <section>
              <h2 className="mb-6 text-xl font-bold text-zinc-100">Cover Letter</h2>
              <CoverLetterTab detail={detail} />
            </section>
          )}
        </div>
      </div>

      {detail.analysis?.tailoredResume && (
        <ResumePreviewDrawer
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          isDownloading={isDownloading}
          onDownload={handleDownloadPreview}
          resume={{
            id: 'tailored',
            resumeId: 'tailored',
            userId: 'user',
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
            label: 'Tailored Resume',
            version: 1,
            isActive: true,
            data: detail.analysis.tailoredResume,
          } as unknown as AdminResumeWithData}
        />
      )}
    </div>
  )
}
