import { render, screen } from '@testing-library/react'
import Music from '@/app/(site)/music/page'

describe('Music Page', () => {
  describe('Page Structure', () => {
    it('renders a main heading', () => {
      render(<Music />)

      const headings = screen.getAllByRole('heading', { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0]).toBeInTheDocument()
    })

    it('renders an introduction section', () => {
      render(<Music />)

      const heading = screen.getByRole('heading', { level: 1 })
      const container = heading.parentElement

      expect(container?.querySelector('p')).toBeInTheDocument()
    })

    it('renders multiple content sections', () => {
      render(<Music />)

      const sections = screen.getAllByRole('heading', { level: 2 })
      expect(sections.length).toBeGreaterThan(3)
    })
  })

  describe('Hero Section', () => {
    it('explains how the music study concept started', () => {
      render(<Music />)

      const heading = screen.getByRole('heading', {
        name: /How this started/i,
      })
      expect(heading).toBeInTheDocument()
    })

    it('includes Lucide music icon', () => {
      render(<Music />)

      const svgs = document.querySelectorAll('svg.lucide-music')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('uses gradient styling', () => {
      render(<Music />)

      const gradientElements = document.querySelectorAll('.bg-gradient-to-br')
      expect(gradientElements.length).toBeGreaterThan(0)
    })
  })

  describe('Notify Me Form', () => {
    it('renders email notification form', () => {
      render(<Music />)

      const emailInput = screen.getByPlaceholderText(
        /your\.email@example\.com/i,
      )
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toBeRequired()
    })

    it('renders submit button', () => {
      render(<Music />)

      const submitButton = screen.getByRole('button', { name: /notify me/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('form renders correctly', () => {
      render(<Music />)

      const emailInput = screen.getByPlaceholderText(
        /your\.email@example\.com/i,
      )
      const form = emailInput.closest('form')

      expect(form).toBeInTheDocument()
    })

    it('displays form heading', () => {
      render(<Music />)

      const heading = screen.getByRole('heading', { name: 'Get Notified' })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Why Songs Helped Section', () => {
    it('renders the section heading', () => {
      render(<Music />)

      const heading = screen.getByRole('heading', {
        name: 'Why songs helped me study',
      })
      expect(heading).toBeInTheDocument()
    })

    it('displays feature cards', () => {
      render(<Music />)

      expect(screen.getByText('Based on real services')).toBeInTheDocument()
      expect(screen.getByText('Easy to remember')).toBeInTheDocument()
      expect(screen.getByText('Hands-free studying')).toBeInTheDocument()
      expect(screen.getByText('Supplement, not replacement')).toBeInTheDocument()
    })

    it('includes feature descriptions', () => {
      render(<Music />)

      expect(
        screen.getByText(/Each song covers a specific AWS service/i),
      ).toBeInTheDocument()
    })

    it('displays Lucide icons for features', () => {
      render(<Music />)

      const svgs = document.querySelectorAll('svg.lucide')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe('Topics Covered Section', () => {
    it('renders the section heading', () => {
      render(<Music />)

      const heading = screen.getByRole('heading', {
        name: /Songs I've recorded so far/i,
      })
      expect(heading).toBeInTheDocument()
    })

    it('lists AWS topics being covered', () => {
      render(<Music />)

      expect(screen.getAllByText(/AWS CodeDeploy/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Amazon ECS/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/AWS Lambda/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/CloudFormation Stacks/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/VPC Networking/i).length).toBeGreaterThan(0)
    })

    it('includes Lucide music note icons', () => {
      render(<Music />)

      const section = screen.getAllByText(/AWS CodeDeploy/i)[0].closest('ul')
      const svgs = section?.querySelectorAll('svg.lucide')
      expect(svgs?.length).toBeGreaterThan(0)
    })
  })

  describe('Note on Expectations Section', () => {
    it('renders the section heading', () => {
      render(<Music />)

      const heading = screen.getByRole('heading', {
        name: 'A note on expectations',
      })
      expect(heading).toBeInTheDocument()
    })

    it('explains the supplementary nature of the songs', () => {
      render(<Music />)

      expect(
        screen.getByText(/study supplement, not a course/i),
      ).toBeInTheDocument()
    })

    it('provides realistic expectations', () => {
      render(<Music />)

      expect(
        screen.getByText(/reading documentation/i),
      ).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<Music />)

      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements).toHaveLength(1)

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)

      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBeGreaterThan(0)
    })

    it('email input has proper aria-label', () => {
      render(<Music />)

      const emailInput = screen.getByLabelText('Email address')
      expect(emailInput).toBeInTheDocument()
    })

    it('form button is keyboard accessible', () => {
      render(<Music />)

      const button = screen.getByRole('button', { name: /notify me/i })
      expect(button.tagName).toBe('BUTTON')
    })

    it('all headings are visible and accessible', () => {
      render(<Music />)

      const allHeadings = screen.getAllByRole('heading')

      allHeadings.forEach((heading) => {
        expect(heading).toBeVisible()
        expect(heading.textContent).toBeTruthy()
      })
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive grid classes', () => {
      render(<Music />)

      const featureSection = screen.getByText(
        'Why songs helped me study',
      ).nextElementSibling
      expect(featureSection).toHaveClass('grid', 'sm:grid-cols-2')
    })

    it('form has responsive layout', () => {
      render(<Music />)

      const button = screen.getByRole('button', { name: /notify me/i })
      const flexContainer = button.closest('.flex-col')
      expect(flexContainer).toHaveClass('sm:flex-row')
    })
  })

  describe('Dark Mode Support', () => {
    it('applies dark mode classes to sections', () => {
      render(<Music />)

      const sections = screen.getAllByRole('heading', { level: 2 })

      sections.forEach((section) => {
        expect(section.className).toContain('dark:')
      })
    })

    it('form input has dark mode styling', () => {
      render(<Music />)

      const emailInput = screen.getByPlaceholderText(
        /your\.email@example\.com/i,
      )
      expect(emailInput.className).toContain('dark:')
    })
  })

  describe('SEO and Metadata', () => {
    it('exports metadata for SEO', () => {
      const MusicModule = require('@/app/(site)/music/page')

      expect(MusicModule.metadata).toBeDefined()
      expect(MusicModule.metadata.title).toBeTruthy()
      expect(MusicModule.metadata.description).toBeTruthy()
    })

    it('metadata contains relevant keywords', () => {
      const MusicModule = require('@/app/(site)/music/page')

      const description = MusicModule.metadata.description.toLowerCase()

      const hasRelevantKeywords =
        description.includes('aws') ||
        description.includes('music') ||
        description.includes('songs') ||
        description.includes('memorise')

      expect(hasRelevantKeywords).toBe(true)
    })
  })

  describe('Content Quality', () => {
    it('displays multiple AWS topics', () => {
      render(<Music />)

      const topics = [
        /CodeDeploy/i,
        /ECS/i,
        /Lambda/i,
        /CloudFormation/i,
        /VPC/i,
      ]

      topics.forEach((topic) => {
        expect(screen.getAllByText(topic).length).toBeGreaterThan(0)
      })
    })

    it('explains the unique value proposition', () => {
      render(<Music />)

      const intro = screen.getByRole('heading', { level: 1 }).parentElement
      expect(intro?.textContent).toContain('study')
    })

    it('includes call-to-action', () => {
      render(<Music />)

      const cta = screen.getByRole('button', { name: /notify me/i })
      expect(cta).toBeVisible()
    })
  })

  describe('Layout Structure', () => {
    it('sections are properly spaced', () => {
      render(<Music />)

      const mainContainer = screen
        .getByRole('heading', { level: 1 })
        .closest('div')
        ?.querySelector('.space-y-8')

      expect(mainContainer).toBeInTheDocument()
    })

    it('renders in proper container', () => {
      render(<Music />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      const container = mainHeading.closest('div')

      expect(container).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now()
      render(<Music />)
      const endTime = Date.now()

      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(100)
    })
  })
})
