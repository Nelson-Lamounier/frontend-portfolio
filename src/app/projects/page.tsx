/**
 * Projects Page — DynamoDB-driven
 *
 * Lists all published articles from DynamoDB as project cards.
 * Categories and icons are derived from article metadata.
 * No hardcoded project data — the source of truth is DynamoDB.
 *
 * Route: /projects
 */

import { type Metadata, type ReactNode } from 'next'

import { SimpleLayout } from '@/components/layout'
import { ProjectsList } from '@/components/projects'
import { getAllArticles } from '@/lib/article-service'
import logoAws from '@/images/logos/aws.png'

import {
  Terminal,
  Server,
  Cloud,
  Database,
  Shield,
  GitBranch,
  Award,
  Cpu,
} from 'lucide-react'

// ========================================
// Category → Icon Mapping
// ========================================

/**
 * Maps article categories to lucide-react icons.
 * Articles without a matching category get the default Cloud icon.
 */
const categoryIcons: Record<string, ReactNode> = {
  'CI/CD': <GitBranch className="h-8 w-8 text-orange-400" />,
  'Infrastructure': <Server className="h-8 w-8 text-purple-400" />,
  'Security': <Shield className="h-8 w-8 text-red-400" />,
  'Monitoring': <Terminal className="h-8 w-8 text-green-400" />,
  'Certification': <Award className="h-8 w-8 text-teal-400" />,
  'Database': <Database className="h-8 w-8 text-yellow-400" />,
  'Compute': <Cpu className="h-8 w-8 text-blue-400" />,
}

/** Fallback icon for categories not in the map */
const defaultIcon = <Cloud className="h-8 w-8 text-blue-400" />

// ========================================
// Metadata
// ========================================

export const metadata: Metadata = {
  title: 'Projects | AWS CDK, CI/CD & Observability',
  description:
    'CDK factory patterns, CI/CD pipelines with OIDC, DevSecOps with Checkov, full-stack observability, and containerised Next.js on ECS — each with a detailed technical write-up.',
}

// ========================================
// Page Component
// ========================================

/**
 * Projects page — fetches published articles from DynamoDB and
 * renders them as project cards with category-based icons.
 */
export default async function Projects() {
  const articles = await getAllArticles()

  // Map articles to project card data
  const projects = articles.map((article, index) => ({
    id: index + 1,
    title: article.title,
    description: article.description || article.aiSummary || '',
    tags: article.tags || [],
    category: article.category || 'Infrastructure',
    link: {
      href: `/articles/${article.slug}`,
      label: 'Read article',
    },
    icon: categoryIcons[article.category || ''] || defaultIcon,
    logo: logoAws,
  }))

  // Derive categories dynamically from article data
  const uniqueCategories = [
    ...new Set(articles.map((a) => a.category || 'Infrastructure')),
  ].sort()
  const categories = ['All', ...uniqueCategories]

  return (
    <SimpleLayout
      title="What I've Built"
      intro="Everything here runs in production on AWS — deployed from a single CDK monorepo, secured with custom Checkov rules, and monitored with a self-hosted Prometheus/Grafana stack. Each project links to a detailed article explaining the architecture, trade-offs, and what I'd do differently."
    >
      <ProjectsList projects={projects} categories={categories} />
    </SimpleLayout>
  )
}
