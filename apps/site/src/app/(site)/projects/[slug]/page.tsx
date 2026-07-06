/**
 * Project Case-Study Page — [slug] Route
 *
 * Renders one Tucaken-generated project case study served by the
 * in-cluster public-api BFF (RDS). The BFF gates visibility server-side
 * (`visibility='public'` only), so any slug that resolves here is a
 * deliberate publish decision by the owner; everything else is a 404.
 *
 * Route: /projects/:slug
 * Revalidation: ISR with 1-hour TTL (fetch layer caches 5 min, matching
 * the BFF's s-maxage).
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { Container } from '@/components/layout'
import { ProjectCaseStudy } from '@/components/projects/ProjectCaseStudy'
import {
  getPublicCaseStudy,
  queryPublicProjects,
} from '@/lib/projects'

// ========================================
// ISR Configuration
// ========================================

export const revalidate = 3600 // Revalidate every hour

// ========================================
// Static Params — Pre-render public projects
// ========================================

/**
 * Pre-render every public project at build time when the BFF is
 * reachable; the data layer returns [] otherwise (Docker builds have no
 * cluster access), and slugs then render on demand via ISR.
 */
export async function generateStaticParams() {
  const projects = await queryPublicProjects()
  return projects.map((p) => ({ slug: p.slug }))
}

// ========================================
// Metadata Generation
// ========================================

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const study = await getPublicCaseStudy(slug)
  if (!study) return {}

  const description =
    study.tagline ??
    study.pitch?.slice(0, 160) ??
    `Case study: ${study.name}`
  return {
    title: `${study.name} | Projects | Nelson Lamounier`,
    description,
  }
}

// ========================================
// Page Component
// ========================================

export default async function ProjectCaseStudyPage({ params }: PageProps) {
  const { slug } = await params

  // Null covers unknown slug, non-public visibility, and BFF unreachable —
  // all render as 404 rather than leaking why the project is absent.
  const study = await getPublicCaseStudy(slug)
  if (!study) notFound()

  return (
    <Container className="mt-16 lg:mt-32">
      <ProjectCaseStudy study={study} />
    </Container>
  )
}
