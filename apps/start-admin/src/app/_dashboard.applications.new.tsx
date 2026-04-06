import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NewAnalysisPanel } from '@/features/applications/components/NewAnalysisPanel'
import { ResumeSelect } from '@/features/applications/components/ResumeSelect'
import { FullWidthBar, type FullWidthBarStep } from '../components/ui/FullWidthBar'
import { DashboardPage } from '@/components/layouts/DashboardPage'

export const Route = createFileRoute('/_dashboard/applications/new')({
  component: ApplicationsNewRoute,
})

function ApplicationsNewRoute() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')

  const steps: FullWidthBarStep[] = [
    {
      name: '1. Select Resume',
      current: step === 1,
      onClick: () => setStep(1),
    },
    {
      name: '2. Job Details',
      current: step === 2,
    },
  ]

  return (
    <DashboardPage
      title="Application Analysis"
      description="Create a new application analysis."
      headerBottom={<FullWidthBar steps={steps} />}
    >
      {step === 1 && (
          <ResumeSelect 
            onSelect={(id) => {
              setSelectedResumeId(id)
              setStep(2)
            }} 
          />
        )}

        {step === 2 && (
          <NewAnalysisPanel 
            preselectedResumeId={selectedResumeId} 
            onSuccess={() => {
               navigate({ to: '/applications/list' })
            }}
          />
        )}
      </DashboardPage>
  )
}
