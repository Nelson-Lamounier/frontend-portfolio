import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckIcon } from '@heroicons/react/20/solid'
import { useApplicationDetail } from '@/hooks/use-admin-applications'
import { Loader2 } from 'lucide-react'

const FAKE_STEPS = [
  { name: 'Initialising analysis', description: 'Booting up agents...', duration: 2000 },
  { name: 'Analysing Job Description', description: 'Extracting key requirements and skills.', duration: 5000 },
  { name: 'Evaluating fit', description: 'Comparing against your resume profile.', duration: 6000 },
  { name: 'Generating assets', description: 'Creating tailored cover letter and improvements.', duration: 8000 },
  { name: 'Finalising report', description: 'Saving results to your dashboard...', duration: 5000 },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function ProgressBars({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const { data } = useApplicationDetail(slug)
  const [currentStepIdx, setCurrentStepIdx] = useState(0)

  const isFinished = data && !['analysing', 'coaching'].includes(data.status)

  // Fake step progression
  useEffect(() => {
    if (isFinished) {
      setCurrentStepIdx(FAKE_STEPS.length)
      return
    }
    if (currentStepIdx >= FAKE_STEPS.length - 1) return

    const timer = setTimeout(() => {
      setCurrentStepIdx((s) => s + 1)
    }, FAKE_STEPS[currentStepIdx].duration)

    return () => clearTimeout(timer)
  }, [currentStepIdx, isFinished])

  // Auto redirect
  useEffect(() => {
    if (isFinished) {
      const t = setTimeout(() => {
        void navigate({ to: '/applications/$slug', params: { slug } })
      }, 500)
      return () => clearTimeout(t)
    }
  }, [isFinished, navigate, slug])

  const getStepStatus = (idx: number) => {
    if (isFinished) return 'complete'
    if (idx < currentStepIdx) return 'complete'
    if (idx === currentStepIdx) return 'current'
    return 'upcoming'
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto px-4 py-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white">Analysing Application</h3>
        <p className="mt-2 text-sm text-zinc-400">
          We're running a deep analysis of your resume against the job description.
        </p>
      </div>

      <nav aria-label="Progress">
        <ol role="list" className="overflow-hidden">
          {FAKE_STEPS.map((step, stepIdx) => {
            const status = getStepStatus(stepIdx)
            return (
              <li key={step.name} className={classNames(stepIdx !== FAKE_STEPS.length - 1 ? 'pb-10' : '', 'relative')}>
                {status === 'complete' ? (
                  <>
                    {stepIdx !== FAKE_STEPS.length - 1 ? (
                      <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-indigo-500" />
                    ) : null}
                    <div className="group relative flex items-start">
                      <span className="flex h-9 items-center">
                        <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-indigo-500">
                          <CheckIcon aria-hidden="true" className="size-5 text-white" />
                        </span>
                      </span>
                      <span className="ml-4 flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-white">{step.name}</span>
                        <span className="text-sm text-zinc-400">{step.description}</span>
                      </span>
                    </div>
                  </>
                ) : status === 'current' ? (
                  <>
                    {stepIdx !== FAKE_STEPS.length - 1 ? (
                      <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-zinc-700" />
                    ) : null}
                    <div aria-current="step" className="group relative flex items-start">
                      <span aria-hidden="true" className="flex h-9 items-center">
                        <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-indigo-500 bg-zinc-900">
                          <span className="size-2.5 rounded-full bg-indigo-500" />
                        </span>
                      </span>
                      <span className="ml-4 flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-indigo-400 flex items-center gap-2">
                          {step.name}
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </span>
                        <span className="text-sm text-zinc-400">{step.description}</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {stepIdx !== FAKE_STEPS.length - 1 ? (
                      <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-white/10" />
                    ) : null}
                    <div className="group relative flex items-start">
                      <span aria-hidden="true" className="flex h-9 items-center">
                        <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-white/10 bg-zinc-900">
                          <span className="size-2.5 rounded-full bg-transparent" />
                        </span>
                      </span>
                      <span className="ml-4 flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-zinc-500">{step.name}</span>
                        <span className="text-sm text-zinc-500">{step.description}</span>
                      </span>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="text-center bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
        <p className="text-sm text-zinc-300">
          Feel free to navigate away. You'll be notified when the analysis is complete.
        </p>
        <Link 
          to="/applications/$slug"
          params={{ slug }}
          className="inline-block mt-3 text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          Go to Application Overview &rarr;
        </Link>
      </div>
    </div>
  )
}
