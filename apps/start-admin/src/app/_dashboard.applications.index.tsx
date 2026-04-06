import { createFileRoute } from '@tanstack/react-router'
import {
  PlusCircleIcon,
  QueueListIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import { Sparkles } from 'lucide-react'
import { GridListActions, type GridListAction } from '../components/ui/GridListActions'
import { DashboardPage } from '../components/layouts/DashboardPage'

const actions: GridListAction[] = [
  {
    title: 'New Analysis',
    href: '/applications/new',
    icon: PlusCircleIcon,
    iconForeground: 'text-teal-400',
    iconBackground: 'bg-teal-500/10',
    description: 'Analyse a new job description against your resume and generate a cover letter.',
  },
  {
    title: 'All Applications',
    href: '/applications/list',
    icon: QueueListIcon,
    iconForeground: 'text-purple-400',
    iconBackground: 'bg-purple-500/10',
    description: 'View and manage all your active and disqualified job applications.',
  },
  {
    title: 'Prepare for Interview',
    href: '/applications/interview-prep',
    icon: AcademicCapIcon,
    iconForeground: 'text-indigo-400',
    iconBackground: 'bg-indigo-500/10',
    description: 'Focus on applications currently in the interview stage to prep and practice.',
  },
  {
    title: 'Create Article',
    href: '/ai-agent?mode=test',
    icon: Sparkles,
    iconForeground: 'text-violet-400',
    iconBackground: 'bg-violet-500/10',
    description: 'Create an Article',
  },
  {
    title: 'Generate Article',
    onClick: () => {},
    icon: Sparkles,
    iconForeground: 'text-zinc-500',
    iconBackground: 'bg-zinc-800',
    description: 'Describe a topic and Bedrock will generate a complete article (Coming Soon)',
  },
]

export const Route = createFileRoute('/_dashboard/applications/')({
  component: ApplicationsIndexRoute,
})

function ApplicationsIndexRoute() {
  return (
    <DashboardPage
      title="Applications Hub"
      description="Manage your job applications and interview preparation."
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <GridListActions actions={actions} />
      </div>
    </DashboardPage>
  )
}

