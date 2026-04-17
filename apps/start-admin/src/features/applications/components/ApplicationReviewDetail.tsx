import { PaperClipIcon } from '@heroicons/react/20/solid'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import type { ApplicationDetail } from '@/lib/types/applications.types'
import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { adminKeys } from '@/lib/api/query-keys'
import { useToastStore } from '@/lib/stores/toast-store'
import { ResumePreviewDrawer } from '../../resumes/components/ResumePreviewDrawer'
import { ResumeForm } from '../../resumes/components/ResumeForm'
import { CoverLetterForm } from './CoverLetterForm'
import { DashboardDrawer } from '../../../components/ui/DashboardDrawer'
import DropDownOptions from '../../../components/ui/DropDownOptions'
import type { AdminResumeWithData } from '../../applications/hooks/use-resume-versions'
import { createResumeFn, setActiveResumeFn } from '../../../server/resumes'
import { deleteApplicationFn } from '../../../server/applications'
import { buildResumeDomForPdf, buildCoverLetterDomForPdf } from '@/lib/resumes/resume-dom-builder'
import { usePdfDownload } from '../../../hooks/use-pdf-download'
import type { ResumeData } from '@/lib/resumes/resume-data'

interface ApplicationReviewDetailProps {
  readonly detail: ApplicationDetail
}

export function ApplicationReviewDetail({ detail }: ApplicationReviewDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isCoverLetterPreviewOpen, setIsCoverLetterPreviewOpen] = useState(false)
  const [isEditResumeOpen, setIsEditResumeOpen] = useState(false)
  const [isEditCoverLetterOpen, setIsEditCoverLetterOpen] = useState(false)
  const { downloading: isDownloading, generatePdf } = usePdfDownload()

  const handleDownloadResume = useCallback(() => {
    if (!detail.analysis?.tailoredResume) return
    const resume = detail.analysis.tailoredResume as unknown as ResumeData
    const company = detail.targetCompany.replace(/\s+/g, '_')
    const role = detail.targetRole.replace(/\s+/g, '_')
    void generatePdf(
      () => buildResumeDomForPdf(resume),
      `Nelson_Lamounier_Resume_${company}_${role}.pdf`,
    )
  }, [detail, generatePdf])

  const handleDownloadCoverLetter = useCallback(() => {
    if (!detail.analysis?.coverLetter) return
    const company = detail.targetCompany.replace(/\s+/g, '_')
    void generatePdf(
      () => buildCoverLetterDomForPdf(
        detail.analysis!.coverLetter!,
        detail.analysis?.tailoredResume?.profile,
        detail.targetCompany,
        detail.targetRole,
      ),
      `Nelson_Lamounier_Cover_Letter_${company}.pdf`,
    )
  }, [detail, generatePdf])

  const publishMutation = useMutation({
    mutationFn: async () => {
      const created = await createResumeFn({
        data: {
          label: `${detail.targetCompany} — ${detail.targetRole}`,
          data: detail.analysis!.tailoredResume as unknown as Record<string, unknown>,
        },
      })
      await setActiveResumeFn({ data: created.resumeId })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.resumes.all })
      addToast('success', 'Resume published to the public site.')
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteApplicationFn({ data: detail.slug }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.applications.all })
      addToast('success', 'Application deleted.')
      void navigate({ to: '/applications/list' })
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  return (
    <div>
      <div className="px-4 sm:px-0 flex items-start justify-between">
        <div>
          <h3 className="text-base/7 font-semibold text-white">Application Information</h3>
          <p className="mt-1 max-w-2xl text-sm/6 text-zinc-400">Application details for {detail.targetCompany}.</p>
        </div>
        <div className="flex shrink-0">
          <DropDownOptions
            onEditResume={() => setIsEditResumeOpen(true)}
            onEditCoverLetter={detail.analysis?.coverLetter ? () => setIsEditCoverLetterOpen(true) : undefined}
            showPreviewResume={!!detail.analysis?.tailoredResume}
            onPreviewResume={() => setIsPreviewOpen(true)}
            showPreviewCoverLetter={!!detail.analysis?.coverLetter}
            onPreviewCoverLetter={detail.analysis?.coverLetter ? () => setIsCoverLetterPreviewOpen(true) : undefined}
            onPublish={detail.analysis?.tailoredResume ? () => publishMutation.mutate() : undefined}
            onDelete={() => deleteMutation.mutate()}
          />
        </div>
      </div>
      <div className="mt-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2">
          <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
            <dt className="text-sm/6 font-medium text-white">Target Company</dt>
            <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">{detail.targetCompany}</dd>
          </div>
          <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
            <dt className="text-sm/6 font-medium text-white">Target Role</dt>
            <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">{detail.targetRole}</dd>
          </div>
          <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
            <dt className="text-sm/6 font-medium text-white">Status</dt>
            <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2 capitalize">{detail.status.replace('-', ' ')}</dd>
          </div>
          <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
            <dt className="text-sm/6 font-medium text-white">Interview Stage</dt>
            <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2 capitalize">{detail.interviewStage.replace('-', ' ')}</dd>
          </div>
          <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
            <dt className="text-sm/6 font-medium text-white">Fit Summary</dt>
            <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">
              {detail.research?.fitSummary ?? 'Analysis in progress...'}
            </dd>
          </div>
          {detail.research?.experienceSignals && (
            <>
              <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
                <dt className="text-sm/6 font-medium text-white">Years Expected</dt>
                <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">{detail.research.experienceSignals.yearsExpected}</dd>
              </div>
              <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
                <dt className="text-sm/6 font-medium text-white">Domain Focus</dt>
                <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">{detail.research.experienceSignals.domain}</dd>
              </div>
              <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
                <dt className="text-sm/6 font-medium text-white">Leadership Level</dt>
                <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">{detail.research.experienceSignals.leadership}</dd>
              </div>

              {/* Resume Suggestions */}
              {detail.analysis?.resumeSuggestions?.summary && (
                <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
                  <dt className="text-sm/6 font-medium text-white">Resume Suggestions</dt>
                  <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">
                    {detail.analysis.resumeSuggestions.summary}
                  </dd>
                </div>
              )}
              <div className="border-t border-white/10 px-4 py-6 sm:col-span-1 sm:px-0">
                <dt className="text-sm/6 font-medium text-white">Scale Expected</dt>
                <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">{detail.research.experienceSignals.scale}</dd>
              </div>
            </>
          )}

          {/* Verified Matches */}
          {detail.research?.verifiedMatches && detail.research.verifiedMatches.length > 0 && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">Verified Matches</dt>
              <dd className="mt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.research.verifiedMatches.map((match) => (
                    <div
                      key={match.skill}
                      className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
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
              </dd>
            </div>
          )}

          {/* Partial Matches */}
          {detail.research?.partialMatches && detail.research.partialMatches.length > 0 && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">Partial Matches</dt>
              <dd className="mt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.research.partialMatches.map((match) => (
                    <div
                      key={match.skill}
                      className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
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
              </dd>
            </div>
          )}

          {/* Skills Gaps */}
          {detail.research?.gaps && detail.research.gaps.length > 0 && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">Skills Gaps</dt>
              <dd className="mt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.research.gaps.map((gap) => (
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
              </dd>
            </div>
          )}

          {/* Technology Inventory */}
          {detail.research?.technologyInventory && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white mb-4">Technology Inventory</dt>
              <dd className="mt-1">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ['Languages', detail.research.technologyInventory.languages],
                    ['Frameworks', detail.research.technologyInventory.frameworks],
                    ['Infrastructure', detail.research.technologyInventory.infrastructure],
                    ['Tools', detail.research.technologyInventory.tools],
                    ['Methodologies', detail.research.technologyInventory.methodologies],
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
                              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              </dd>
            </div>
          )}


          <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
            <dt className="text-sm/6 font-medium text-white">Attachments</dt>
            <dd className="mt-2 text-sm text-white">
              <ul role="list" className="divide-y divide-white/5 rounded-md border border-white/10">
                <li className="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
                  <div className="flex w-0 flex-1 items-center">
                    <PaperClipIcon aria-hidden="true" className="size-5 shrink-0 text-zinc-500" />
                    <div className="ml-4 flex min-w-0 flex-1 gap-2">
                      <span className="truncate font-medium text-white">tailored_resume.pdf</span>
                      <span className="shrink-0 text-zinc-500">2.4mb</span>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 flex gap-4">
                    <button type="button" onClick={handleDownloadResume} disabled={isDownloading} className="font-medium text-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50">
                      {isDownloading ? 'Generating…' : 'Download'}
                    </button>
                  </div>
                </li>
                {detail.analysis?.coverLetter && (
                  <li className="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
                    <div className="flex w-0 flex-1 items-center">
                      <PaperClipIcon aria-hidden="true" className="size-5 shrink-0 text-zinc-500" />
                      <div className="ml-4 flex min-w-0 flex-1 gap-2">
                        <span className="truncate font-medium text-white">cover_letter.pdf</span>
                        <span className="shrink-0 text-zinc-500">1.2mb</span>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 flex gap-4">
                      <button type="button" onClick={handleDownloadCoverLetter} disabled={isDownloading} className="font-medium text-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50">
                        {isDownloading ? 'Generating…' : 'Download'}
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            </dd>
          </div>
        </dl>
      </div>

      {detail.analysis?.tailoredResume && (
        <ResumePreviewDrawer
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          isDownloading={isDownloading}
          onDownload={handleDownloadResume}
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

       {detail.analysis?.coverLetter && (
        <ResumePreviewDrawer
          isOpen={isCoverLetterPreviewOpen}
          onClose={() => setIsCoverLetterPreviewOpen(false)}
          isDownloading={isDownloading}
          onDownload={handleDownloadCoverLetter}
          coverLetter={detail.analysis.coverLetter}
          coverLetterProfile={detail.analysis.tailoredResume?.profile}
          coverLetterCompany={detail.targetCompany}
          coverLetterRole={detail.targetRole}
        />
      )}

      {detail.analysis?.tailoredResume && (
        <DashboardDrawer
          isOpen={isEditResumeOpen}
          onClose={() => setIsEditResumeOpen(false)}
          title="Edit Tailored Resume"
          description={`${detail.targetCompany} - ${detail.targetRole}`}
          unstyledContent
        >
          <div className="h-full overflow-y-auto no-scrollbar">
            <ResumeForm
              mode="edit"
              initialLabel="Tailored Resume"
              initialData={detail.analysis.tailoredResume}
              onCancel={() => setIsEditResumeOpen(false)}
              onSubmit={async (_label, _data) => {
                /* console.log('Resume updated', { label, data }) */
                setIsEditResumeOpen(false)
              }}
            />
          </div>
        </DashboardDrawer>
      )}

      {detail.analysis?.coverLetter && (
        <DashboardDrawer
          isOpen={isEditCoverLetterOpen}
          onClose={() => setIsEditCoverLetterOpen(false)}
          title="Edit Cover Letter"
          description={`${detail.targetCompany} - ${detail.targetRole}`}
          unstyledContent
        >
          <div className="h-full overflow-y-auto no-scrollbar">
            <CoverLetterForm
              initialContent={detail.analysis.coverLetter}
              onCancel={() => setIsEditCoverLetterOpen(false)}
              onSubmit={async (_content) => {
                /* console.log('Cover letter updated', content) */
                setIsEditCoverLetterOpen(false)
              }}
            />
          </div>
        </DashboardDrawer>
      )}
    </div>
  )
}

