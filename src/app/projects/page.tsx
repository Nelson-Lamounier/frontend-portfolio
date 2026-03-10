import { type Metadata } from 'next'

import { SimpleLayout } from '@/components/layout'
import { ProjectsList } from '@/components/projects'
import logoAws from '@/images/logos/aws.png'

import {
  Terminal,
  Server,
  Cloud,
  Database,
  Shield,
  GitBranch,
  Award,
} from 'lucide-react'

const projects = [
  {
    id: 1,
    title: 'Enterprise CI/CD Pipeline',
    description:
      '19 workflow files deploying 4 CDK projects across 3 AWS accounts with OIDC federation, SLSA provenance tagging, environment-scoped Checkov scanning, and auto-rollback — zero long-lived credentials.',
    tags: ['GitHub Actions', 'CDK', 'OIDC', 'SLSA'],
    category: 'CI/CD',
    link: {
      href: '/articles/enterprise-cicd-pipeline-github-actions',
      label: 'Read article',
    },
    icon: <GitBranch className="h-8 w-8 text-orange-400" />,
    logo: logoAws,
  },
  {
    id: 2,
    title: 'CDK Project Factory Pattern',
    description:
      'A construct-to-factory pipeline managing 4 projects and 11 stacks from a single 105-line entry point — with typed config modules, SSM-based cross-stack discovery, and a 31-file L3 construct library.',
    tags: ['CDK', 'TypeScript', 'Factory Pattern', 'L3 Constructs'],
    category: 'Infrastructure',
    link: {
      href: '/articles/cdk-project-factory-pattern',
      label: 'Read article',
    },
    icon: <Server className="h-8 w-8 text-purple-400" />,
    logo: logoAws,
  },
  {
    id: 3,
    title: 'DevSecOps Pipeline',
    description:
      '33 custom Checkov rules across 26 Python files, CDK-Nag with 4 compliance frameworks, SARIF integration with GitHub Security — catching IMDSv1 bugs before they reach CloudFormation.',
    tags: ['Checkov', 'CDK-Nag', 'SARIF', 'Python'],
    category: 'Security',
    link: {
      href: '/articles/devsecops-pipeline-checkov-cdk-nag',
      label: 'Read article',
    },
    icon: <Shield className="h-8 w-8 text-red-400" />,
    logo: logoAws,
  },
  {
    id: 4,
    title: 'Direct DynamoDB X-Ray Tracing',
    description:
      'Eliminated a 5-hop API round-trip with sub-5ms VPC Gateway Endpoint reads, OpenTelemetry instrumentation, in-memory TTL cache, and file-based fallback — at $0/month incremental cost.',
    tags: ['DynamoDB', 'X-Ray', 'OpenTelemetry', 'VPC'],
    category: 'Infrastructure',
    link: {
      href: '/articles/direct-dynamodb-xray-instrumentation',
      label: 'Read article',
    },
    icon: <Database className="h-8 w-8 text-yellow-400" />,
    logo: logoAws,
  },
  {
    id: 5,
    title: 'Full-Stack Observability',
    description:
      '7 Docker containers on a single EC2 instance — Prometheus, Grafana, Loki, Tempo — with Cloud Map DNS service discovery, 9 dashboards from S3, and zero public ingress.',
    tags: ['Prometheus', 'Grafana', 'Loki', 'Tempo'],
    category: 'Monitoring',
    link: {
      href: '/articles/full-stack-observability',
      label: 'Read article',
    },
    icon: <Terminal className="h-8 w-8 text-green-400" />,
    logo: logoAws,
  },
  {
    id: 6,
    title: 'Next.js ECS CloudFront Deployment',
    description:
      'A 6-stack CDK architecture deploying containerized Next.js across ECS on EC2, CloudFront with WAF, API Gateway with Lambda, DynamoDB, and S3 — with auto-deploy from ECR pushes and deployment circuit breakers.',
    tags: ['ECS', 'CloudFront', 'API Gateway', 'WAF'],
    category: 'Infrastructure',
    link: {
      href: '/articles/nextjs-ecs-cloudfront-aws-deployment',
      label: 'Read article',
    },
    icon: <Cloud className="h-8 w-8 text-blue-400" />,
    logo: logoAws,
  },
  {
    id: 7,
    title: 'AWS DevOps Pro Certification',
    description:
      'From scoring 726 (24 points short) to passing — a refined exam strategy covering multi-service architectures, deployment decision trees, and the SPIDER elimination method.',
    tags: ['AWS', 'Certification', 'DevOps Professional'],
    category: 'Certification',
    link: {
      href: '/articles/aws-devops-pro-exam-failure-to-success',
      label: 'Read article',
    },
    icon: <Award className="h-8 w-8 text-teal-400" />,
    logo: logoAws,
  },
]

const categories = [
  'All',
  'Infrastructure',
  'CI/CD',
  'Security',
  'Monitoring',
  'Certification',
]

export const metadata: Metadata = {
  title:
    'Projects | AWS CDK, CI/CD & Observability',
  description:
    'CDK factory patterns, CI/CD pipelines with OIDC, DevSecOps with Checkov, full-stack observability, and containerized Next.js on ECS — each with a detailed technical write-up.',
}

export default function Projects() {
  return (
    <SimpleLayout
      title="What I've Built"
      intro="Everything here runs in production on AWS — deployed from a single CDK monorepo, secured with custom Checkov rules, and monitored with a self-hosted Prometheus/Grafana stack. Each project links to a detailed article explaining the architecture, trade-offs, and what I'd do differently."
    >
      <ProjectsList projects={projects} categories={categories} />
    </SimpleLayout>
  )
}
