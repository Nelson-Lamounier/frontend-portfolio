import { PaperClipIcon } from '@heroicons/react/20/solid'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { ApplicationDetail } from '@/lib/types/applications.types'
interface ApplicationReviewDetailProps {
  readonly detail: ApplicationDetail
}

export function ApplicationReviewDetail({ detail }: ApplicationReviewDetailProps) {
  return (
    <div>
      <div className="px-4 sm:px-0">
        <h3 className="text-base/7 font-semibold text-white">Application Information</h3>
        <p className="mt-1 max-w-2xl text-sm/6 text-zinc-400">Application details for {detail.targetCompany}.</p>
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


          {/* Resume Suggestions summary */}
          {detail.analysis?.resumeSuggestions?.summary && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">Resume Suggestions</dt>
              <dd className="mt-1 text-sm/6 text-zinc-400 sm:mt-2">
                {detail.analysis.resumeSuggestions.summary}
              </dd>
            </div>
          )}

          {/* Additions */}
          {detail.analysis?.resumeSuggestions?.additionItems && detail.analysis.resumeSuggestions.additionItems.length > 0 && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">Suggested Additions</dt>
              <dd className="mt-4">
                <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.analysis.resumeSuggestions.additionItems.map((item, idx) => (
                    <li key={`add-${String(idx)}`}>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {item.section}
                      </h4>
                      <p className="text-sm/6 text-zinc-400">{item.suggestedBullet}</p>
                      {item.sourceCitation && (
                        <p className="mt-1.5 text-xs text-zinc-500">Source: {item.sourceCitation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}

          {/* Reframes */}
          {detail.analysis?.resumeSuggestions?.reframeItems && detail.analysis.resumeSuggestions.reframeItems.length > 0 && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">Suggested Reframes</dt>
              <dd className="mt-4">
                <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.analysis.resumeSuggestions.reframeItems.map((item, idx) => (
                    <li key={`reframe-${String(idx)}`}>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {item.section}
                      </h4>
                      <div className="mb-3">
                        <span className="text-xs font-medium text-red-400/80 uppercase tracking-widest">
                          Original:
                        </span>
                        <p className="mt-1 text-sm/6 text-zinc-400 line-through">{item.original}</p>
                      </div>
                      <div className="mb-3">
                        <span className="text-xs font-medium text-emerald-400/80 uppercase tracking-widest">
                          Suggested:
                        </span>
                        <p className="mt-1 text-sm/6 text-zinc-300">{item.suggested}</p>
                      </div>
                      <p className="text-xs text-zinc-500">
                        <span className="font-medium text-zinc-400">Rationale:</span> {item.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}

          {/* ESL Corrections */}
          {detail.analysis?.resumeSuggestions?.eslCorrectionItems && detail.analysis.resumeSuggestions.eslCorrectionItems.length > 0 && (
            <div className="border-t border-white/10 px-4 py-6 sm:col-span-2 sm:px-0">
              <dt className="text-sm/6 font-medium text-white">ESL Corrections</dt>
              <dd className="mt-4">
                <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.analysis.resumeSuggestions.eslCorrectionItems.map((item, idx) => (
                    <li key={`esl-${String(idx)}`} className="flex flex-col gap-3">
                      <div>
                        <span className="text-xs font-medium text-red-400/80 uppercase tracking-widest">
                          Original:
                        </span>
                        <p className="mt-1 text-sm/6 text-zinc-400 line-through">{item.original}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-sky-400/80 uppercase tracking-widest">
                          Corrected:
                        </span>
                        <p className="mt-1 text-sm/6 text-zinc-300">{item.corrected}</p>
                      </div>
                    </li>
                  ))}
                </ul>
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
                  <div className="ml-4 shrink-0">
                    <button type="button" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                      Download
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
                    <div className="ml-4 shrink-0">
                      <button type="button" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
                        Download
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
