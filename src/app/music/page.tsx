import { type Metadata } from 'next'
import { SimpleLayout } from '@/components/SimpleLayout'
import { MusicNotifyForm } from './MusicNotifyForm'
import { MusicPlayer } from './MusicPlayer'
import {
  Music as MusicIcon,
  BookOpen,
  Guitar,
  Headphones,
  GraduationCap,
  Music2,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cloud Study Songs | Learning AWS Through Music',
  description:
    'I wrote songs about AWS services to help me memorise concepts during gym sessions. Here\'s what I\'ve recorded so far.',
}

export default function Music() {
  return (
    <SimpleLayout
      title="Cloud Study Songs"
      intro="I wrote songs about AWS services to study during gym sessions and runs. It didn't replace real studying and hands-on implementation, but it helped me memorise service names, deployment patterns, and exam concepts during time I'd otherwise waste."
    >
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-8 dark:border-zinc-700/40 dark:bg-zinc-800/50">
          <div className="flex items-start gap-6">
            <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-blue-500">
              <MusicIcon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
                How this started
              </h2>
              <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                While preparing for the AWS DevOps Professional exam, I felt
                like my gym time was wasted study time. So I started writing
                short songs about AWS services &mdash; CodeDeploy strategies,
                ECS task definitions, VPC networking &mdash; and listening to
                them on repeat during workouts. The songs didn&apos;t replace
                reading docs or building projects, but they helped concepts
                stick. I&apos;m recording more and plan to share them here.
              </p>
            </div>
          </div>
        </div>

        {/* Music Player */}
        <MusicPlayer />

        {/* Notify Me Form */}
        <MusicNotifyForm />

        {/* What Makes This Different */}
        <div className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-700/40">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Why songs helped me study
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-teal-500/10">
                <BookOpen className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                  Based on real services
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Each song covers a specific AWS service or deployment pattern
                  I was actually studying for the exam
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-500/10">
                <Guitar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                  Easy to remember
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Melody makes technical details stick &mdash; I can still hum
                  the CodeDeploy song months later
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-purple-500/10">
                <Headphones className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                  Hands-free studying
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Good for the gym, running, commuting &mdash; any time you
                  can&apos;t read a whitepaper
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-orange-500/10">
                <GraduationCap className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                  Supplement, not replacement
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  These helped me review concepts I&apos;d already studied
                  &mdash; they don&apos;t replace reading docs or building
                  projects
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Topics Covered */}
        <div className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-700/40">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Songs I&apos;ve recorded so far
          </h2>
          <ul className="mt-4 space-y-3 text-base text-zinc-600 dark:text-zinc-400">
            <li className="flex items-start gap-3">
              <Music2 className="h-4 w-4 flex-none text-teal-500" />
              <span>
                <strong>AWS CodeDeploy</strong> &mdash; Blue/Green, Canary, and
                Rolling deployment strategies
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Music2 className="h-4 w-4 flex-none text-teal-500" />
              <span>
                <strong>Amazon ECS</strong> &mdash; Task definitions, services,
                and container orchestration basics
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Music2 className="h-4 w-4 flex-none text-teal-500" />
              <span>
                <strong>AWS Lambda &amp; Auto Scaling</strong> &mdash;
                Event-driven triggers and scaling policies
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Music2 className="h-4 w-4 flex-none text-teal-500" />
              <span>
                <strong>CloudFormation Stacks</strong> &mdash;
                Infrastructure-as-Code concepts and stack lifecycle
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Music2 className="h-4 w-4 flex-none text-teal-500" />
              <span>
                <strong>VPC Networking</strong> &mdash; Subnets, route tables,
                and security groups
              </span>
            </li>
          </ul>
        </div>

        {/* Why This Works */}
        <div className="rounded-2xl border border-zinc-100 bg-teal-50 p-8 dark:border-zinc-700/40 dark:bg-teal-900/10">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            A note on expectations
          </h2>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
            These songs are a study supplement, not a course. They helped me
            review AWS concepts during downtime &mdash; gym, commute, cooking
            &mdash; but I still passed the exam by reading documentation,
            building real infrastructure, and doing practice tests. If
            you&apos;re curious, sign up above and I&apos;ll share the tracks
            as I finish recording them.
          </p>
        </div>
      </div>
    </SimpleLayout>
  )
}
