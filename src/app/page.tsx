import { type Metadata } from 'next'
import Image from 'next/image'

import { Card } from '@/components/Card'
import { Container } from '@/components/Container'
import { DevOpsPipelineAnimation } from '@/components/DevOpsPipelineAnimation'
import { TrackedSocialLinks } from '@/components/TrackedSocialLinks'
import { ResumeDownloadButton } from '@/components/ResumeDownloadButton'
import { ResumePreview } from '@/components/ResumePreview'
import { NewsletterForm } from '@/components/NewsletterForm'
import {
  GitHubIcon,
  LinkedInIcon,
} from '@/components/SocialIcons'
import logoFacebook from '@/images/logos/facebook.svg'
import logoPlanetaria from '@/images/logos/planetaria.svg'
import logoaws from '@/images/logos/aws.png'
import awsDevOpsBadge from '@/images/logos/aws-certified-devops-engineer-professional.png'
import logsedwick from '@/images/logos/sedwick.png'
import { getAllArticles } from '@/lib/article-service'
import type { ArticleWithSlug } from '@/lib/types/article.types'
import { formatDate } from '@/lib/formatDate'



function BriefcaseIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2.75 9.75a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5.75a3 3 0 0 1-3-3v-8.5Z"
        className="fill-zinc-100 stroke-zinc-400 dark:fill-zinc-100/10 dark:stroke-zinc-500"
      />
      <path
        d="M3 14.25h6.249c.484 0 .952-.002 1.316.319l.777.682a.996.996 0 0 0 1.316 0l.777-.682c.364-.32.832-.319 1.316-.319H21M8.75 6.5V4.75a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2V6.5"
        className="stroke-zinc-400 dark:stroke-zinc-500"
      />
    </svg>
  )
}



function Article({ article }: { article: ArticleWithSlug }) {
  return (
    <Card as="article">
      <Card.Title href={`/articles/${article.slug}`}>
        {article.title}
      </Card.Title>
      <Card.Eyebrow as="time" dateTime={article.date} decorate>
        {formatDate(article.date)}
      </Card.Eyebrow>
      <Card.Description>{article.description}</Card.Description>
      <Card.Cta>Read article</Card.Cta>
    </Card>
  )
}

function SocialLink({
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<'a'> & {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <a
      className="group -m-1 p-1"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      <Icon className="h-6 w-6 fill-zinc-500 transition group-hover:fill-zinc-600 dark:fill-zinc-400 dark:group-hover:fill-zinc-300" />
    </a>
  )
}

export const metadata: Metadata = {
  title: 'Nelson Lamounier | DevOps Engineer & Cloud Infrastructure',
  description:
    'AWS Certified DevOps Engineer based in Dublin. I build production infrastructure with CDK, run a self-hosted observability stack, and write about real-world cloud problems.',
}

interface Role {
  company: string
  title: string
  logo: React.ComponentProps<typeof Image>['src']
  start: string | { label: string; dateTime: string }
  end: string | { label: string; dateTime: string }
}

function Role({ role }: { role: Role }) {
  const startLabel =
    typeof role.start === 'string' ? role.start : role.start.label
  const startDate =
    typeof role.start === 'string' ? role.start : role.start.dateTime

  const endLabel = typeof role.end === 'string' ? role.end : role.end.label
  const endDate = typeof role.end === 'string' ? role.end : role.end.dateTime

  return (
    <li className="flex gap-4">
      <div className="relative mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full shadow-md ring-1 shadow-zinc-800/5 ring-zinc-900/5 dark:border dark:border-zinc-700/50 dark:bg-zinc-800 dark:ring-0">
        <Image src={role.logo} alt="" className="h-7 w-7" />
      </div>
      <dl className="flex flex-auto flex-wrap gap-x-2">
        <dt className="sr-only">Company</dt>
        <dd className="w-full flex-none text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {role.company}
        </dd>
        <dt className="sr-only">Role</dt>
        <dd className="text-xs text-zinc-500 dark:text-zinc-400">
          {role.title}
        </dd>
        <dt className="sr-only">Date</dt>
        <dd
          className="ml-auto text-xs text-zinc-400 dark:text-zinc-500"
          aria-label={`${startLabel} until ${endLabel}`}
        >
          <time dateTime={startDate}>{startLabel}</time>{' '}
          <span aria-hidden="true">—</span>{' '}
          <time dateTime={endDate}>{endLabel}</time>
        </dd>
      </dl>
    </li>
  )
}

function Resume() {
  const resume: Array<Role> = [
    {
      company: 'Amazon Web Services (AWS)',
      title: 'Technical Customer Service Associate',
      logo: logoaws,
      start: '2022',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear().toString(),
      },
    },
    {
      company: 'Freelance',
      title: 'DevOps & Infrastructure Engineer',
      logo: logoPlanetaria,
      start: '2022',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear().toString(),
      },
    },
    {
      company: 'Meta (via Accenture)',
      title: 'Quality Assurance Analyst',
      logo: logoFacebook,
      start: '2021',
      end: '2022',
    },
    {
      company: 'Sedgwick',
      title: 'Insurance Agent',
      logo: logsedwick,
      start: '2019',
      end: '2021',
    },
  ]

  return (
    <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
      <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <BriefcaseIcon className="h-6 w-6 flex-none" />
        <span className="ml-3">Work</span>
      </h2>
      <ol className="mt-6 space-y-4">
        {resume.map((role, roleIndex) => (
          <Role key={roleIndex} role={role} />
        ))}
      </ol>
      <ResumeDownloadButton />
      <ResumePreview />
    </div>
  )
}

export default async function Home() {
  const articles = (await getAllArticles()).slice(0, 4)

  return (
    <>
      <Container className="mt-9">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
              AWS Certified DevOps Engineer &mdash; Professional
            </h1>
            <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
              Hi, I&apos;m Nelson. I work at AWS in Dublin and build production
              infrastructure on the side. My day job is debugging customer
              workloads across EC2, ECS, IAM, and VPC. Outside of work, I&apos;ve
              built a 6-stack CDK architecture, a self-hosted observability
              platform (Prometheus, Grafana, Loki, Tempo), and the CI/CD
              pipelines that keep them running. I write about the real problems
              I solve along the way.
            </p>
            <div className="mt-6 flex items-center gap-6">
              <TrackedSocialLinks>
              <SocialLink
                href="https://github.com/Nelson-Lamounier"
                aria-label="Follow on GitHub"
                icon={GitHubIcon}
              />
              <SocialLink
                href="https://www.linkedin.com/in/nelson-lamounier-leao/"
                aria-label="Follow on LinkedIn"
                icon={LinkedInIcon}
              />
              </TrackedSocialLinks>
            </div>
          </div>
          <a
            href="https://www.credly.com/badges/9db44668-e0b6-409c-977a-99a1636d04f9/public_url"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden flex-none sm:block"
          >
            <Image
              src={awsDevOpsBadge}
              alt="AWS Certified DevOps Engineer Professional badge"
              className="h-28 w-28 drop-shadow-md transition hover:scale-105 lg:h-36 lg:w-36"
            />
          </a>
        </div>
      </Container>
      <DevOpsPipelineAnimation />
      <Container className="mt-24 md:mt-28">
        <div className="mx-auto grid max-w-xl grid-cols-1 gap-y-20 lg:max-w-none lg:grid-cols-2">
          <div className="flex flex-col gap-16">
            {articles.map((article) => (
              <Article key={article.slug} article={article} />
            ))}
          </div>
          <div className="space-y-10 lg:pl-16 xl:pl-24">
            <NewsletterForm />
            <Resume />
          </div>
        </div>
      </Container>
    </>
  )
}
