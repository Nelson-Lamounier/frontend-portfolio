'use client'

import { Download } from 'lucide-react'
import { ResumeDocument } from '@/components/resume/ResumeDocument'
import { Button } from '../../../components/ui/Button'
import type { AdminResumeWithData } from '@/lib/api/admin-api'
import { DashboardDrawer } from '../../../components/ui/DashboardDrawer'

interface ResumePreviewDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly resume?: AdminResumeWithData | null
  readonly onDownload: () => void
  readonly isDownloading: boolean
}

export function ResumePreviewDrawer({
  isOpen,
  onClose,
  resume,
  onDownload,
  isDownloading,
}: ResumePreviewDrawerProps) {
  return (
    <DashboardDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="PDF Preview"
      description={resume?.label ?? 'Loading...'}
      unstyledContent
      actions={
        resume && (
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
              <ResumeDocument data={resume.data} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">
          Loading preview...
        </div>
      )}
    </DashboardDrawer>
  )
}
