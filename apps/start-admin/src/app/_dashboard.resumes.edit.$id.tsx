import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ResumeForm } from '../features/resumes/components/ResumeForm'
import { getResumeFn, updateResumeFn } from '../server/resumes'
import { useToastStore } from '@/lib/stores/toast-store'
import { DashboardDrawer } from '../components/ui/DashboardDrawer'

export const Route = createFileRoute('/_dashboard/resumes/edit/$id')({
  component: EditResumePage,
})

import { useState, useEffect } from 'react'

/**
 * Admin page for editing an existing resume version.
 *
 * @returns Edit resume form page
 */
function EditResumePage() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Slight delay to ensure the component is mounted before trigger the slide-in
    const t = setTimeout(() => setIsOpen(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setIsOpen(false)
    setTimeout(() => {
      navigate({ to: '/resumes' })
    }, 400) // matches duration-500 roughly, just enough to feel right
  }
  const navigate = useNavigate({ from: Route.fullPath })
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  const { data: resume, isLoading, error } = useQuery({
    queryKey: ['admin-resume', id],
    queryFn: () => (getResumeFn as any)({ data: id }),
  })

  const updateMutation = useMutation({
    mutationFn: (variables: { label: string; data: any }) => 
      (updateResumeFn as any)({ data: { resumeId: id, label: variables.label, data: variables.data } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-resumes'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-resume', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin-resume-preview', id] })
      addToast('success', 'Resume saved successfully.')
      navigate({ to: '/resumes' })
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  return (
    <DashboardDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Resume Version"
      description={resume?.label ? `Updating ${resume.label}` : ''}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
        </div>
      ) : error || !resume ? (
        <div className="mx-auto max-w-3xl py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error?.message || 'Resume not found'}
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: '/resumes' })}
            className="mt-4 text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400"
          >
            ← Back to Resumes
          </button>
        </div>
      ) : (
        <div className="pb-8">
          <ResumeForm
            mode="edit"
            resumeId={resume.resumeId}
            initialLabel={resume.label}
            initialData={resume.data}
            onSubmit={async (label, data) => {
              await updateMutation.mutateAsync({ label, data })
            }}
            onCancel={handleClose}
          />
        </div>
      )}
    </DashboardDrawer>
  )
}
