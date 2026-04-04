import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ResumeForm } from '../features/resumes/components/ResumeForm'
import { createResumeFn } from '../server/resumes'
import { useToastStore } from '@/lib/stores/toast-store'
import { DashboardDrawer } from '../components/ui/DashboardDrawer'

export const Route = createFileRoute('/_dashboard/resumes/new')({
  component: CreateResumePage,
})

import { useState, useEffect } from 'react'

/**
 * Admin page for creating a new resume version.
 *
 * @returns Create resume form page
 */
function CreateResumePage() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setIsOpen(false)
    setTimeout(() => {
      navigate({ to: '/resumes' })
    }, 400)
  }
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  const createMutation = useMutation({
    mutationFn: (variables: { label: string; data: any }) =>
      (createResumeFn as any)({ data: { label: variables.label, data: variables.data } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-resumes'] })
      addToast('success', 'Resume created successfully.')
      navigate({ to: '/resumes' })
    },
    onError: (err: Error) => addToast('error', err.message),
  })

  return (
    <DashboardDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Resume Version"
    >
      <div className="pb-8">
        <ResumeForm
          mode="create"
          onSubmit={async (label, data) => {
            await createMutation.mutateAsync({ label, data })
          }}
          onCancel={handleClose}
        />
      </div>
    </DashboardDrawer>
  )
}
