'use client'

import { Download } from 'lucide-react'
import { ResumeDocument } from '@/components/resume/ResumeDocument'
import { CoverLetterDocument } from '@/components/resume/CoverLetterDocument'
import { Button } from '../../../components/ui/Button'
import type { AdminResumeWithData } from '../../applications/hooks/use-resume-versions'
import { DashboardDrawer } from '../../../components/ui/DashboardDrawer'
import type { ResumeData, ResumeProfile } from '@/lib/resumes/resume-data'

interface ResumePreviewDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly resume?: AdminResumeWithData | null
  readonly coverLetter?: string | null
  readonly coverLetterProfile?: ResumeProfile
  readonly coverLetterCompany?: string
  readonly coverLetterRole?: string
  readonly onDownload: () => void
  readonly isDownloading: boolean
}

export function ResumePreviewDrawer({
  isOpen,
  onClose,
  resume,
  coverLetter,
  coverLetterProfile,
  coverLetterCompany,
  coverLetterRole,
  onDownload,
  isDownloading,
}: ResumePreviewDrawerProps) {
  const hasContent = !!resume || !!coverLetter
  const description = resume ? (resume.label ?? 'Resume') : (coverLetter ? 'Cover Letter' : 'Loading...')

  return (
    <DashboardDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="PDF Preview"
      description={description}
      unstyledContent
      actions={
        hasContent && (
          <Button
            variant="primary"
            size="sm"
            onClick={onDownload}
            disabled={isDownloading}
          >
            <Download className="mr-2 size-4" />
            {isDownloading ? 'Generating…' : 'Download PDF'}
          </Button>
        )
      }
    >
      {resume ? (
        <div className="h-full overflow-y-auto no-scrollbar rounded-xl border border-white/10 bg-black/40 p-6 shadow-inner relative">
          <div
            className="mx-auto origin-top"
            style={{ width: '794px', transform: 'scale(0.95)', transformOrigin: 'top center' }}
          >
            <div className="flex flex-col gap-6 [&>div>div]:rounded-lg [&>div>div]:shadow-2xl [&>div>div]:ring-1 [&>div>div]:ring-white/10 relative z-10 bg-white">
              <ResumeDocument data={resume.data as unknown as ResumeData} />
            </div>
          </div>
        </div>
      ) : coverLetter ? (
        <div className="h-full overflow-y-auto no-scrollbar rounded-xl border border-white/10 bg-black/40 p-6 shadow-inner relative">
          <div
            className="mx-auto origin-top"
            style={{ width: '794px', transform: 'scale(0.95)', transformOrigin: 'top center' }}
          >
            <div className="flex flex-col gap-6 [&>div]:rounded-lg [&>div]:shadow-2xl [&>div]:ring-1 [&>div]:ring-white/10 relative z-10 bg-white">
              <CoverLetterDocument
                content={coverLetter}
                profile={coverLetterProfile}
                targetCompany={coverLetterCompany}
                targetRole={coverLetterRole}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-500">
          Loading preview...
        </div>
      )}
    </DashboardDrawer>
  )
}
