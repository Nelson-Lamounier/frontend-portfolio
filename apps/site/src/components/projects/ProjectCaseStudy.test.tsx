/**
 * Tests for the ProjectCaseStudy renderer.
 *
 * The contract under test: sections render only when the pipeline
 * produced content (empty case studies degrade to header + repos, not
 * empty scaffolding), stack groups preserve producer ordering, and repo
 * links de-duplicate multi-component entries.
 */
import { render, screen } from '@testing-library/react'
import { ProjectCaseStudy } from './ProjectCaseStudy'
import type { PublicCaseStudy } from '@/lib/projects'

// Mermaid renders client-side via dynamic import — irrelevant here, and
// loading the real module would pull the mermaid package into jsdom.
jest.mock('@/components/articles', () => ({
  Mermaid: ({ chart }: { chart?: string }) => (
    <div data-testid="mermaid">{chart}</div>
  ),
}))

const BASE: PublicCaseStudy = {
  username: 'owner',
  slug: 'ai-platform',
  name: 'AI Platform',
  tagline: 'Grounded case study',
  pitch: 'A platform that generates evidence-cited case studies.',
  type: 'production_saas',
  shape: 'multi_repo',
  status: 'active',
  roleExhibited: 'sole_builder',
  startedAt: null,
  endedAt: null,
  lastActivityAt: null,
  updatedAt: '2026-07-05T00:00:00.000Z',
  components: [],
  repositories: [],
  decisions: [],
  highlights: [],
  challenges: [],
  stack: [],
  depthMarkers: null,
  architecture: null,
  resumeBullets: [],
  tags: ['aws', 'rag'],
}

describe('ProjectCaseStudy', () => {
  it('renders header, pitch, and tag chips', () => {
    render(<ProjectCaseStudy study={BASE} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'AI Platform' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Production SaaS')).toBeInTheDocument()
    expect(screen.getByText('Sole Builder')).toBeInTheDocument()
    expect(screen.getByText('Grounded case study')).toBeInTheDocument()
    expect(screen.getByText(/evidence-cited case studies/)).toBeInTheDocument()
    expect(screen.getByText('rag')).toBeInTheDocument()
  })

  it('omits empty sections entirely (no scaffolding for pending case studies)', () => {
    render(<ProjectCaseStudy study={{ ...BASE, pitch: null }} />)
    for (const title of [
      'Overview',
      'Stack',
      'Architecture',
      'Highlights',
      'Challenges',
      'Key Decisions',
      'What This Demonstrates',
      'Repositories',
    ]) {
      expect(screen.queryByText(title)).not.toBeInTheDocument()
    }
  })

  it('groups stack items by category in producer order', () => {
    const study: PublicCaseStudy = {
      ...BASE,
      stack: [
        { category: 'language', name: 'TypeScript', justification: null, order_index: 0 },
        { category: 'infrastructure', name: 'AWS CDK', justification: 'IaC', order_index: 1 },
        { category: 'language', name: 'Python', justification: null, order_index: 2 },
      ],
    }
    render(<ProjectCaseStudy study={study} />)
    expect(screen.getByText('Stack')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Infrastructure')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
  })

  it('renders the mermaid architecture only for mermaid diagrams', () => {
    const withDiagram: PublicCaseStudy = {
      ...BASE,
      architecture: { diagram_format: 'mermaid', diagram_source: 'graph TD; A-->B' },
    }
    render(<ProjectCaseStudy study={withDiagram} />)
    expect(screen.getByTestId('mermaid')).toHaveTextContent('graph TD; A-->B')
  })

  it('renders highlights, challenges, decisions, and resume bullets when present', () => {
    const full: PublicCaseStudy = {
      ...BASE,
      highlights: [{ title: 'Grounded output', description: 'Cited claims', order_index: 0 }],
      challenges: [{ problem: 'pgvector dims', solution: 'Pinned them', order_index: 0 }],
      decisions: [{
        title: 'Tool-use enforcement',
        context: 'Free text parsed badly',
        decision: 'Force a tool call',
        consequences: 'Typed verdicts',
        confidence: 'high',
        order_index: 0,
      }],
      resumeBullets: [{ angle: 'backend', bullets: ['Shipped the pipeline.'] }],
    }
    render(<ProjectCaseStudy study={full} />)
    expect(screen.getByText('Grounded output')).toBeInTheDocument()
    expect(screen.getByText('pgvector dims')).toBeInTheDocument()
    expect(screen.getByText('Tool-use enforcement')).toBeInTheDocument()
    expect(screen.getByText('Shipped the pipeline.')).toBeInTheDocument()
  })

  it('de-duplicates repository links across components', () => {
    const study: PublicCaseStudy = {
      ...BASE,
      repositories: [
        { component_id: 'c1', repository_full_name: 'owner/mono', subpath: 'api' },
        { component_id: 'c2', repository_full_name: 'owner/mono', subpath: 'web' },
      ],
    }
    render(<ProjectCaseStudy study={study} />)
    const links = screen.getAllByRole('link', { name: 'owner/mono' })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', 'https://github.com/owner/mono')
  })
})
