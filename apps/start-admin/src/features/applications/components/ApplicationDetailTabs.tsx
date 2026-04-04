import { useState, useCallback } from 'react'
import {
  Loader2,
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
  Target,
  DollarSign,
  AlertCircle,
  Send,
} from 'lucide-react'
import { useApplicationCoach } from '@/lib/hooks/use-application-coach'
import { ResumeDocument } from '@/components/resume/ResumeDocument'
import type { ApplicationDetail, InterviewStage, ResumeSuggestions } from '@/lib/types/applications.types'
import {
  REC_COLOURS,
  RECOMMENDATION_LABELS,
  STAGE_LABELS,
} from './ApplicationTypes'
import { StatCard } from './ApplicationStatsGrid'

function SectionHeading({ title, subtitle }: { readonly title: string; readonly subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  )
}


export function OverviewTab({ detail }: { readonly detail: ApplicationDetail }) {
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
              {RECOMMENDATION_LABELS[analysisData.metadata.applicationRecommendation]}
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

export function SkillsTab({ detail }: { readonly detail: ApplicationDetail }) {
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

export function ResumeSuggestionsPanel({ suggestions }: { readonly suggestions: ResumeSuggestions }) {
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

export function CoverLetterTab({ detail }: { readonly detail: ApplicationDetail }) {
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

export function TailoredResumeTab({ detail }: { readonly detail: ApplicationDetail }) {
  const [downloading, setDownloading] = useState(false)
  const resumeData = detail.analysis?.tailoredResume

  const handleDownload = useCallback(async () => {
    if (downloading || !resumeData) return
    setDownloading(true)

    try {
      const [html2canvasModule, jspdfModule, domBuilderModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
        import('@/lib/resumes/resume-dom-builder'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule
      const { buildResumeDomForPdf, A4_WIDTH, A4_HEIGHT, PDF_BG } = domBuilderModule

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.zIndex = '-9999'
      document.body.appendChild(container)

      const resumeEl = buildResumeDomForPdf(resumeData)
      container.appendChild(resumeEl)

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 200))

      const actualHeight = resumeEl.scrollHeight
      const canvas = await html2canvas(resumeEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: PDF_BG,
        width: A4_WIDTH,
        height: actualHeight,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const pageCount = Math.round(actualHeight / A4_HEIGHT)

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage()

        const srcY = page * (A4_HEIGHT * 2)
        const srcH = Math.min(A4_HEIGHT * 2, canvas.height - srcY)

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = A4_WIDTH * 2
        pageCanvas.height = A4_HEIGHT * 2

        const ctx = pageCanvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = PDF_BG
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          ctx.drawImage(
            canvas,
            0,
            srcY,
            A4_WIDTH * 2,
            srcH,
            0,
            0,
            A4_WIDTH * 2,
            srcH
          )
        }

        const pageImgData = pageCanvas.toDataURL('image/png')
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = `Tailored_Resume_${detail.targetCompany.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      document.body.removeChild(container)
      
      const { trackResumeDownload } = await import('@/lib/observability/analytics')
      trackResumeDownload()
    } catch (error) {
      console.error('Resume PDF generation failed:', error)
      alert('Failed to generate resume PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }, [downloading, resumeData, detail.targetCompany])

  if (!resumeData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-400" />
        <p>Tailored resume generation in progress…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-zinc-900 to-zinc-900 shadow-lg shadow-violet-500/5">
        <div className="flex items-center justify-between border-b border-violet-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20">
              <ScrollText className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Tailored Resume
              </h3>
              <p className="text-xs text-zinc-500">
                Optimised for {detail.targetCompany} — {detail.targetRole}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800
                       px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
        <div className="px-6 py-8 overflow-x-auto flex justify-center">
          {/* Scaled-down preview wrapper */}
          <div className="origin-top scale-[0.6] sm:scale-[0.8] md:scale-100 transition-transform">
            <div className="flex flex-col gap-6 [&>div>div]:rounded-lg [&>div>div]:shadow-2xl [&>div>div]:ring-1 [&>div>div]:ring-black/5">
              <ResumeDocument data={resumeData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
