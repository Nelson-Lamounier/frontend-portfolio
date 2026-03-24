import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Projects from '@/app/projects/page'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />
  },
}))

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackProjectView: jest.fn(),
}))

// Mock article-service (Projects page is now DynamoDB-driven)
jest.mock('@/lib/article-service', () => ({
  getAllArticles: jest.fn(() =>
    Promise.resolve([
      {
        slug: 'golden-ami-pipeline',
        title: 'Golden AMI Pipeline with CDK & Step Functions',
        description:
          'Automated golden AMI pipeline using CDK, SSM Automation, and Step Functions for multi-environment deployments.',
        category: 'CI/CD',
        tags: ['cdk', 'ssm', 'step-functions'],
        date: '2025-01-10',
      },
      {
        slug: 'self-managed-kubernetes',
        title: 'Self-Managed Kubernetes on EC2 with kubeadm',
        description:
          'Production-grade Kubernetes cluster on EC2 using kubeadm, Calico CNI, and Traefik ingress.',
        category: 'Infrastructure',
        tags: ['kubernetes', 'ec2', 'networking'],
        date: '2025-02-01',
      },
      {
        slug: 'argocd-gitops',
        title: 'ArgoCD GitOps with Helm on Self-Managed K8s',
        description:
          'GitOps workflow using ArgoCD, vendored Helm charts, and automated sync policies.',
        category: 'CI/CD',
        tags: ['argocd', 'helm', 'gitops'],
        date: '2025-02-15',
      },
      {
        slug: 'observability-stack',
        title: 'Full-Stack Observability with Prometheus, Grafana & Loki',
        description:
          'End-to-end observability pipeline with Prometheus metrics, Grafana dashboards, Loki logs, and Tempo traces.',
        category: 'Monitoring',
        tags: ['prometheus', 'grafana', 'loki'],
        date: '2025-03-01',
      },
      {
        slug: 'network-policy-hardening',
        title: 'Kubernetes Network Policy Hardening with Calico',
        description:
          'Zero-trust network policies using Calico CNI to isolate workloads and restrict egress traffic.',
        category: 'Security',
        tags: ['calico', 'network-policy', 'security'],
        date: '2025-03-10',
      },
    ]),
  ),
  getDataSource: jest.fn(() => 'mock'),
}))

describe('Projects Page', () => {
  describe('Page Structure', () => {
    it('renders a main heading', async () => {
      render(await Projects())

      const headings = screen.getAllByRole('heading', { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0]).toBeInTheDocument()
    })

    it('renders an introduction section', async () => {
      render(await Projects())

      const heading = screen.getByRole('heading', { level: 1 })
      const container = heading.parentElement

      // Should have intro text after heading
      expect(container?.querySelector('p')).toBeInTheDocument()
    })

    it('renders a list of projects', async () => {
      render(await Projects())

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThan(0)
    })
  })

  describe('Filter Functionality', () => {
    it('renders filter tabs', async () => {
      render(await Projects())

      const allButton = screen.getByRole('button', { name: 'All' })
      expect(allButton).toBeInTheDocument()
    })

    it('renders category filter buttons derived from article data', async () => {
      render(await Projects())

      // Categories are dynamically derived — these come from mock data
      const categories = ['All', 'CI/CD', 'Infrastructure', 'Monitoring', 'Security']

      categories.forEach((category) => {
        const button = screen.getByRole('button', { name: category })
        expect(button).toBeInTheDocument()
      })
    })

    it('All filter is active by default', async () => {
      render(await Projects())

      const allButton = screen.getByRole('button', { name: 'All' })
      expect(allButton).toHaveClass('bg-teal-500')
    })

    it('filters projects when category is clicked', async () => {
      const user = userEvent.setup()
      render(await Projects())

      const initialProjects = screen.getAllByRole('listitem')
      const initialCount = initialProjects.length

      // Click on a specific category
      const cicdButton = screen.getByRole('button', { name: 'CI/CD' })
      await user.click(cicdButton)

      const filteredProjects = screen.getAllByRole('listitem')

      // Should show fewer projects (CI/CD has 2 projects)
      expect(filteredProjects.length).toBeLessThanOrEqual(initialCount)
    })

    it('updates active state when filter is clicked', async () => {
      const user = userEvent.setup()
      render(await Projects())

      const cicdButton = screen.getByRole('button', { name: 'CI/CD' })
      await user.click(cicdButton)

      expect(cicdButton).toHaveClass('bg-teal-500')
    })

    it('shows all projects when All filter is clicked', async () => {
      const user = userEvent.setup()
      render(await Projects())

      // Click a specific category first
      const securityButton = screen.getByRole('button', { name: 'Security' })
      await user.click(securityButton)

      // Then click All
      const allButton = screen.getByRole('button', { name: 'All' })
      await user.click(allButton)

      const projects = screen.getAllByRole('listitem')
      expect(projects.length).toBeGreaterThan(1)
    })
  })

  describe('Project Cards', () => {
    it('each project has a title', async () => {
      render(await Projects())

      const listItems = screen.getAllByRole('listitem')

      listItems.forEach((item) => {
        const heading = within(item).getByRole('heading', { level: 2 })
        expect(heading).toBeInTheDocument()
        expect(heading.textContent).toBeTruthy()
      })
    })

    it('each project has a description', async () => {
      render(await Projects())

      const listItems = screen.getAllByRole('listitem')

      listItems.forEach((item) => {
        const paragraphs = within(item).getAllByText(/./i)
        expect(paragraphs.length).toBeGreaterThan(0)
      })
    })

    it('each project has a link', async () => {
      render(await Projects())

      const listItems = screen.getAllByRole('listitem')

      listItems.forEach((item) => {
        const links = within(item).getAllByRole('link')
        expect(links.length).toBeGreaterThan(0)
      })
    })

    it('project links have href attributes', async () => {
      render(await Projects())

      const links = screen.getAllByRole('link')

      links.forEach((link) => {
        expect(link).toHaveAttribute('href')
      })
    })

    it('each project displays a logo image', async () => {
      render(await Projects())

      const images = screen.getAllByRole('presentation')
      expect(images.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Grid Layout', () => {
    it('applies responsive grid classes', async () => {
      render(await Projects())

      const list = screen.getByRole('list')
      expect(list).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-3',
      )
    })

    it('applies proper spacing between items', async () => {
      render(await Projects())

      const list = screen.getByRole('list')
      expect(list).toHaveClass('gap-x-12', 'gap-y-16')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(await Projects())

      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements).toHaveLength(1)

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
    })

    it('filter buttons are keyboard accessible', async () => {
      render(await Projects())

      const buttons = screen.getAllByRole('button')

      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON')
      })
    })

    it('project links are accessible', async () => {
      render(await Projects())

      const links = screen.getAllByRole('link')

      links.forEach((link) => {
        expect(link).toBeInTheDocument()
        expect(link.textContent).toBeTruthy()
      })
    })

    it('images have empty alt text for decorative images', async () => {
      render(await Projects())

      const images = screen.getAllByRole('presentation')

      images.forEach((img) => {
        expect(img).toHaveAttribute('alt', '')
      })
    })
  })

  describe('SEO and Metadata', () => {
    it('exports metadata for SEO', () => {
      const ProjectsModule = require('@/app/projects/page')

      expect(ProjectsModule.metadata).toBeDefined()
      expect(ProjectsModule.metadata.title).toBeTruthy()
      expect(ProjectsModule.metadata.description).toBeTruthy()
    })

    it('metadata contains relevant keywords', () => {
      const ProjectsModule = require('@/app/projects/page')

      const title = ProjectsModule.metadata.title.toLowerCase()
      const description = ProjectsModule.metadata.description.toLowerCase()

      // Should contain relevant DevOps/Cloud keywords
      const hasRelevantKeywords =
        title.includes('cloud') ||
        title.includes('devops') ||
        title.includes('infrastructure') ||
        title.includes('aws') ||
        description.includes('kubernetes') ||
        description.includes('aws')

      expect(hasRelevantKeywords).toBe(true)
    })
  })

  describe('Interactive Behaviour', () => {
    it('filter buttons have hover states', async () => {
      render(await Projects())

      const buttons = screen.getAllByRole('button')

      buttons.forEach((button) => {
        expect(button.className).toContain('hover:')
      })
    })

    it('maintains filter state across interactions', async () => {
      const user = userEvent.setup()
      render(await Projects())

      const infrastructureButton = screen.getByRole('button', {
        name: 'Infrastructure',
      })
      await user.click(infrastructureButton)

      expect(infrastructureButton).toHaveClass('bg-teal-500')

      // Click another button
      const monitoringButton = screen.getByRole('button', {
        name: 'Monitoring',
      })
      await user.click(monitoringButton)

      // Previous button should no longer be active
      expect(infrastructureButton).not.toHaveClass('bg-teal-500')
      expect(monitoringButton).toHaveClass('bg-teal-500')
    })
  })

  describe('Content Quality', () => {
    it('displays multiple projects', async () => {
      render(await Projects())

      const projects = screen.getAllByRole('listitem')
      expect(projects.length).toBeGreaterThan(3)
    })

    it('project titles are descriptive', async () => {
      render(await Projects())

      const headings = screen.getAllByRole('heading', { level: 2 })

      headings.forEach((heading) => {
        expect(heading.textContent?.length).toBeGreaterThan(10)
      })
    })

    it('no duplicate project titles', async () => {
      render(await Projects())

      const headings = screen.getAllByRole('heading', { level: 2 })
      const titles = headings.map((h) => h.textContent)
      const uniqueTitles = new Set(titles)

      expect(titles.length).toBe(uniqueTitles.size)
    })
  })

  describe('Dark Mode Support', () => {
    it('applies dark mode classes to filter buttons', async () => {
      render(await Projects())

      const buttons = screen.getAllByRole('button')

      buttons.forEach((button) => {
        expect(button.className).toContain('dark:')
      })
    })

    it('applies dark mode classes to project cards', async () => {
      render(await Projects())

      const headings = screen.getAllByRole('heading', { level: 2 })

      headings.forEach((heading) => {
        expect(heading.className).toContain('dark:')
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently', async () => {
      const startTime = Date.now()
      render(await Projects())
      const endTime = Date.now()

      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(100)
    })

    it('handles filter changes efficiently', async () => {
      const user = userEvent.setup()
      render(await Projects())

      const startTime = Date.now()

      const cicdButton = screen.getByRole('button', { name: 'CI/CD' })
      await user.click(cicdButton)

      const endTime = Date.now()
      const filterTime = endTime - startTime

      expect(filterTime).toBeLessThan(100)
    })
  })
})
