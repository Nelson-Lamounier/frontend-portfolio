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
    'I\'m Nelson, a Dublin-based Cloud & DevOps Engineer at AWS. I build production-grade infrastructure on self-managed Kubernetes with CDK (TypeScript), ArgoCD GitOps, and AI-powered self-healing.',
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
            I&apos;m Nelson. I build and operate production AWS
            infrastructure, from self-managed Kubernetes to AI-powered
            self-healing.
          </h1>
          <div className="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
            <p>
              My path to DevOps started at AWS. I joined as a Technical
              Customer Service Associate after graduating with a Computer
              Science degree in Dublin. That role put me on the front lines of
              customer infrastructure problems: digging through
              CloudTrail logs, debugging IAM permission boundaries, and helping
              people figure out why their ECS tasks weren&apos;t starting or
              why their costs suddenly doubled. You learn fast when every
              ticket is someone else&apos;s production issue.
            </p>
            <p>
              But there&apos;s a gap between understanding AWS services and
              building with them. So I built my own portfolio as real
              production infrastructure. What started as a single deployment
              grew into a self-managed Kubernetes cluster on AWS,
              provisioned with kubeadm, defined entirely in CDK (TypeScript),
              and spanning multiple operational domains. Workloads deploy
              through ArgoCD GitOps with ApplicationSet, images build and push
              via reusable GitHub Actions workflows with OIDC auth, and Day-1
              orchestration runs through Step Functions and SSM Automation.
            </p>
            <p>
              The full observability stack runs on that same cluster:
              Prometheus Operator for metrics, Grafana for dashboards, Loki for
              log aggregation, and Tempo for distributed tracing, all
              deployed via Helm charts through ArgoCD. Traffic flows from
              CloudFront through an NLB to Traefik IngressRoutes, with Calico
              CNI and NetworkPolicy enforcing pod-level segmentation. Every
              architecture choice is documented in ADRs: why self-managed K8s
              over EKS, why Traefik over ALB, why ArgoCD over Flux.
            </p>
            <p>
              More recently, I&apos;ve built AI-powered infrastructure tooling.
              A self-healing agent uses Bedrock AgentCore with MCP to
              automatically diagnose and remediate CloudWatch alarms,
              complete with Cognito M2M authentication, FinOps token-budget
              guardrails, and a dead-letter queue safety net. An AI content
              pipeline uses Bedrock with RAG (Pinecone) to generate articles
              from briefs, with adaptive thinking budgets that scale with
              content complexity. The entire platform runs on a minimal monthly
              spend by design.
            </p>
            <p>
              The articles I write here come from problems I&apos;ve actually
              hit. Not theory, not course material. If I write about CDK stack
              separation or Kubernetes networking or ArgoCD sync strategies,
              it&apos;s because I dealt with the broken version first and had
              to fix it. I hope they save someone else a few hours of
              debugging.
            </p>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              AWS DevOps Engineer &mdash; Professional &nbsp;|&nbsp; BSc
              Computer Science, Dublin
            </p>
          </div>
          <div className="mt-10 border-t border-zinc-100 pt-8 dark:border-zinc-700/40">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-teal-500"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              Beyond Code
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              When I&apos;m not building infrastructure, I&apos;m making music.
              It&apos;s a creative outlet that keeps me sane — and a reminder
              that not every problem requires a YAML file.{' '}
              <a
                href="/music"
                className="font-medium text-teal-500 transition hover:text-teal-600 dark:hover:text-teal-400"
              >
                Have a listen →
              </a>
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
