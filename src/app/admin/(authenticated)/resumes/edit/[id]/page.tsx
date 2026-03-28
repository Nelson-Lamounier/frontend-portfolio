/**
 * Edit Resume Page
 *
 * Fetches an existing resume by ID and renders the ResumeForm
 * in edit mode with pre-populated data.
 *
 * Route: /admin/resumes/edit/[id]
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ResumeForm } from '@/components/resume/ResumeForm'
import type { ResumeWithData } from '@/lib/resumes/dynamodb-resumes'

interface EditResumePageProps {
  params: Promise<{ id: string }>
}

type PageState = 'loading' | 'ready' | 'error'

/**
 * Admin page for editing an existing resume version.
 *
 * @param props - Route params containing resume ID
 * @returns Edit resume form page
 */
export default function EditResumePage(props: EditResumePageProps) {
  const router = useRouter()
  const { id } = use(props.params)
  const [state, setState] = useState<PageState>('loading')
  const [resume, setResume] = useState<ResumeWithData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResume() {
      try {
        const res = await fetch(`/api/admin/resumes/${id}`)

        if (res.status === 401) {
          router.push('/admin/login')
          return
        }

        if (res.status === 404) {
          setError('Resume not found')
          setState('error')
          return
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const data = await res.json() as ResumeWithData
        setResume(data)
        setState('ready')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch resume')
        setState('error')
      }
    }

    fetchResume()
  }, [id, router])

  if (state === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
      </div>
    )
  }

  if (state === 'error' || !resume) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error || 'Resume not found'}
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/resumes')}
          className="mt-4 text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400"
        >
          ← Back to Resumes
        </button>
      </div>
    )
  }

  return (
    <ResumeForm
      mode="edit"
      resumeId={resume.resumeId}
      initialLabel={resume.label}
      initialData={resume.data}
    />
  )
}
