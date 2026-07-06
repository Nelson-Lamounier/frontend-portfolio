/**
 * Tests for the ProjectCards grid.
 *
 * Covers the behaviour a recruiter-facing grid must not regress on:
 * card content (type eyebrow, case-study link, tagline, stack chips with
 * +N truncation, repo count) and the type filter (hidden for a single
 * type, filtering on click).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCards, type ProjectCardData } from './ProjectCards'

// GA4 tracking calls window.gtag; irrelevant to rendering behaviour.
jest.mock('@/lib/observability/analytics', () => ({
  trackProjectView: jest.fn(),
}))

const card = (over: Partial<ProjectCardData> = {}): ProjectCardData => ({
  slug: 'ai-platform',
  name: 'AI Platform',
  tagline: 'An evidence-grounded case study',
  typeLabel: 'Production SaaS',
  stack: ['TypeScript', 'AWS CDK', 'Kubernetes'],
  repositories: ['owner/repo-a', 'owner/repo-b'],
  tags: ['aws'],
  ...over,
})

describe('ProjectCards', () => {
  it('renders the card: type eyebrow, linked name, tagline, stack chips, repo count', () => {
    render(<ProjectCards projects={[card()]} typeLabels={['Production SaaS']} />)

    expect(screen.getByText('Production SaaS')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI Platform' })).toHaveAttribute(
      'href',
      '/projects/ai-platform',
    )
    expect(screen.getByText('An evidence-grounded case study')).toBeInTheDocument()
    expect(screen.getByText('AWS CDK')).toBeInTheDocument()
    expect(screen.getByText('2 repositories')).toBeInTheDocument()
    expect(screen.getByText('View case study')).toBeInTheDocument()
  })

  it('truncates stack chips beyond six with a +N indicator', () => {
    const many = card({
      stack: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'],
    })
    render(<ProjectCards projects={[many]} typeLabels={['Production SaaS']} />)
    expect(screen.getByText('Six')).toBeInTheDocument()
    expect(screen.queryByText('Seven')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('hides the filter tabs when every project shares one type', () => {
    render(<ProjectCards projects={[card()]} typeLabels={['Production SaaS']} />)
    // "All" only exists as a tab; a single-type grid renders no tab bar.
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
  })

  it('filters cards by type label and shows all again on "All"', () => {
    const projects = [
      card(),
      card({ slug: 'side', name: 'Side Thing', typeLabel: 'Side Project' }),
    ]
    render(
      <ProjectCards
        projects={projects}
        typeLabels={['Production SaaS', 'Side Project']}
      />,
    )

    // Both visible initially.
    expect(screen.getByText('AI Platform')).toBeInTheDocument()
    expect(screen.getByText('Side Thing')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Side Project' }))
    expect(screen.queryByText('AI Platform')).not.toBeInTheDocument()
    expect(screen.getByText('Side Thing')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('AI Platform')).toBeInTheDocument()
  })

  it('omits tagline and repo count when absent', () => {
    const bare = card({ tagline: null, repositories: [] })
    render(<ProjectCards projects={[bare]} typeLabels={['Production SaaS']} />)
    expect(screen.queryByText(/repositor/)).not.toBeInTheDocument()
  })
})
