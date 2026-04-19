import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { PlusCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { useResumeVersions } from '../hooks/use-resume-versions'
import { Link } from '@tanstack/react-router'
import { Loader2, Wand2 } from 'lucide-react'

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export interface ResumeSelectProps {
  onSelect: (resumeId: string) => void
}

export function ResumeSelect({ onSelect }: ResumeSelectProps) {
  const { data: resumeVersions, isLoading } = useResumeVersions()

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  const hasResumes = resumeVersions && resumeVersions.length > 0

  if (!hasResumes) {
    return (
      <div className="mx-auto max-w-lg text-center mt-12 mb-8 overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-sm p-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-zinc-400" />
        <h3 className="mt-2 text-sm font-semibold text-white">No resumes found</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Create a resume first, or let the agent build one from your portfolio knowledge base.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            to="/resumes/new"
            className="inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            <PlusCircleIcon aria-hidden="true" className="-ml-0.5 mr-1.5 size-5" />
            Create new Resume
          </Link>
          <button
            type="button"
            onClick={() => onSelect('')}
            className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Wand2 className="size-4" />
            Build from scratch with the agent
          </button>
        </div>
      </div>
    )
  }

  // Sort: active resume first, then by date descending
  const sortedResumes = [...resumeVersions].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <div className="mx-auto max-w-2xl mt-8">
      <h2 className="text-base font-semibold text-white">Select a Resume</h2>
      <p className="mt-1 text-sm text-zinc-400">Choose the resume version you want to use for this analysis.</p>
      
      <ul role="list" className="mt-6 divide-y divide-white/10 border-y border-white/10">
        {sortedResumes.map((resume) => (
          <li key={resume.resumeId}>
            <div 
              className="group relative flex items-start space-x-3 py-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => onSelect(resume.resumeId)}
            >
              <div className="shrink-0 ml-4">
                <span
                  className={classNames(
                    resume.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400',
                    'inline-flex size-10 items-center justify-center rounded-lg'
                  )}
                >
                  <DocumentTextIcon aria-hidden="true" className="size-6" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  <span>{resume.label}</span>
                  {resume.isActive && (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Last updated {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="shrink-0 self-center pr-4">
                <ChevronRightIcon aria-hidden="true" className="size-5 text-zinc-500 group-hover:text-zinc-300" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-6 flex items-center justify-between pl-4">
        <Link to="/resumes/new" className="hidden sm:inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300">
          Or create a new resume
          <span aria-hidden="true" className="ml-1">&rarr;</span>
        </Link>
        <button
          type="button"
          onClick={() => onSelect('')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-violet-400 transition-colors"
        >
          <Wand2 className="size-4" />
          Build from scratch with the agent
        </button>
      </div>
    </div>
  )
}
