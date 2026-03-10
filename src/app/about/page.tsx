import { type Metadata } from 'next'
import Image from 'next/image'
import clsx from 'clsx'

import { Container } from '@/components/layout'
import { TrackedSocialLinks } from '@/components/analytics'
import {
  GitHubIcon,
  LinkedInIcon,
} from '@/components/social'
import portraitImage from '@/images/portrait.jpg'

function SocialLink({
  className,
  href,
  children,
  icon: Icon,
}: {
  className?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <li className={clsx(className, 'flex')}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex text-sm font-medium text-zinc-800 transition hover:text-teal-500 dark:text-zinc-200 dark:hover:text-teal-500"
      >
        <Icon className="h-6 w-6 flex-none fill-zinc-500 transition group-hover:fill-teal-500" />
        <span className="ml-4">{children}</span>
      </a>
    </li>
  )
}

function MailIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z"
      />
    </svg>
  )
}

export const metadata: Metadata = {
  title: 'About Nelson | Cloud & DevOps Engineer',
  description:
    'I\'m Nelson, a Dublin-based DevOps Engineer working at AWS. I build production infrastructure with CDK, run my own observability stack, and write about the real problems I solve along the way.',
}

export default function About() {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-12">
        <div className="lg:pl-20">
          <div className="max-w-xs px-2.5 lg:max-w-none">
            <Image
              src={portraitImage}
              alt=""
              sizes="(min-width: 1024px) 32rem, 20rem"
              className="aspect-square rotate-3 rounded-2xl bg-zinc-100 object-cover dark:bg-zinc-800"
            />
          </div>
        </div>
        <div className="lg:order-first lg:row-span-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
            I&apos;m Nelson. I work at AWS by day, and build production
            infrastructure by night.
          </h1>
          <div className="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
            <p>
              My path to DevOps wasn&apos;t planned. I graduated in Dublin with a
              Computer Science degree focused on web development and cloud
              computing, then joined AWS as a Technical Customer Service
              Associate. That role put me on the front lines of customer
              infrastructure problems. I spent my days digging through
              CloudTrail logs, debugging IAM permission boundaries, and helping
              people figure out why their ECS tasks weren&apos;t starting or why
              their costs suddenly doubled. You learn fast when every ticket is
              someone else&apos;s production issue.
            </p>
            <p>
              But there&apos;s a gap between understanding AWS services and
              actually building with them. Early on I was mostly a frontend
              developer. I could build interfaces, but I had no idea how to
              deploy them properly. Which CI/CD tool should I use? How do I
              structure environments? What&apos;s the right trade-off between
              shipping fast and not going broke on AWS bills? I didn&apos;t have
              a team to ask, so I figured it out myself.
            </p>
            <p>
              The turning point was deciding to build my own portfolio as real
              infrastructure, not just a frontend project. I wrote the CI/CD
              pipelines in GitHub Actions with OIDC auth (no static
              credentials), defined everything as code in AWS CDK TypeScript,
              containerised the app with Docker and deployed it on ECS. That
              grew into a 6-stack architecture separated by operational domain,
              with SSM-based service discovery, container hardening (non-root,
              dropped capabilities, tini), and a multi-tier WAF. I passed the
              AWS DevOps Engineer Professional exam along the way, which
              validated a lot of what I&apos;d been learning the hard way.
            </p>
            <p>
              More recently, I built a self-hosted observability platform from
              scratch: Prometheus, Grafana, Loki, and Tempo running as a
              7-container Docker Compose stack on EC2. It has DNS-based service
              discovery, OpenTelemetry trace ingestion, and a full CI/CD
              pipeline with policy-as-code scanning, drift detection, smoke
              tests, and automated rollback if anything fails. At work, I also
              handle security incidents involving compromised IAM keys, which
              means I spend a fair amount of time in CloudTrail, coordinating
              credential rotations and debugging trust relationships.
            </p>
            <p>
              The articles I write here come from problems I&apos;ve actually
              hit. Not theory, not course material. If I write about CDK stack
              separation or container security or CloudFront cache policies,
              it&apos;s because I dealt with the broken version first and had
              to fix it. I hope they save someone else a few hours of
              debugging.
            </p>
          </div>
        </div>
        <div className="lg:pl-20">
          <TrackedSocialLinks>
          <ul role="list">
            <SocialLink
              href="https://github.com/Nelson-Lamounier"
              icon={GitHubIcon}
            >
              Follow on GitHub
            </SocialLink>
            <SocialLink
              href="https://www.linkedin.com/in/nelson-lamounier-leao/"
              icon={LinkedInIcon}
              className="mt-4"
            >
              Follow on LinkedIn
            </SocialLink>
            <SocialLink
              href="mailto:lamounierleao@outlook.com"
              icon={MailIcon}
              className="mt-8 border-t border-zinc-100 pt-8 dark:border-zinc-700/40"
            >
              lamounierleao@outlook.com
            </SocialLink>
          </ul>
          </TrackedSocialLinks>
        </div>
      </div>
    </Container>
  )
}
