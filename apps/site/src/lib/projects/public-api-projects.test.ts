/**
 * Tests for the Tucaken projects data layer.
 *
 * Mocks global.fetch (jsdom provides none) — the contract under test is
 * the graceful-degradation behaviour (build/ISR must survive an
 * unreachable BFF) and the pass-through of the BFF's JSON-stable shapes,
 * not the network.
 */
import {
  queryPublicProjects,
  getPublicCaseStudy,
} from './public-api-projects'
import { projectTypeLabel, humanizeEnum } from './labels'

const CARD = {
  slug: 'tucaken',
  name: 'Tucaken',
  tagline: 'A grounded RAG portfolio',
  type: 'production_saas',
  shape: 'multi_repo',
  roleExhibited: 'sole_builder',
  caseStudyStatus: 'complete',
  startedAt: '2025-06-01T00:00:00.000Z',
  lastActivityAt: '2025-07-01T00:00:00.000Z',
  updatedAt: '2025-07-01T00:00:00.000Z',
  tags: ['rag', 'aws'],
  stack: [{ category: 'language', name: 'TypeScript' }],
  repositories: ['alice/tucaken-api'],
}

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)

// jsdom ships no fetch; install a fresh mock per test and remove it after
// so no other suite inherits a stubbed network.
let fetchMock: jest.Mock
beforeEach(() => {
  fetchMock = jest.fn()
  ;(global as { fetch?: unknown }).fetch = fetchMock
})
afterEach(() => {
  delete (global as { fetch?: unknown }).fetch
  jest.restoreAllMocks()
})

describe('queryPublicProjects', () => {
  it('returns the items array from the BFF list payload', async () => {
    fetchMock.mockImplementation(() => okJson({ items: [CARD], count: 1 }))
    const items = await queryPublicProjects()
    expect(items).toHaveLength(1)
    expect(items[0].slug).toBe('tucaken')
    // The owner username is part of the request path — the BFF keys
    // public projects on GitHub identity, not internal user ids.
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toMatch(/\/public\/projects\/[A-Za-z0-9-]+$/)
  })

  it('returns [] on a non-OK response (graceful degradation)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502 } as Response)
    expect(await queryPublicProjects()).toEqual([])
  })

  it('returns [] when fetch throws (BFF unreachable at build time)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(await queryPublicProjects()).toEqual([])
  })
})

describe('getPublicCaseStudy', () => {
  it('returns the case study payload as-is', async () => {
    const study = { ...CARD, username: 'alice', pitch: 'p', status: 'active' }
    fetchMock.mockImplementation(() => okJson(study))
    const result = await getPublicCaseStudy('tucaken')
    expect(result?.slug).toBe('tucaken')
    expect(result?.pitch).toBe('p')
  })

  it('returns null on 404 (private/unknown slug maps to notFound, not a crash)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 } as Response)
    expect(await getPublicCaseStudy('nope')).toBeNull()
  })
})

describe('labels', () => {
  it('uses curated labels for known types and humanises unknown enums', () => {
    expect(projectTypeLabel('production_saas')).toBe('Production SaaS')
    expect(projectTypeLabel('future_new_type')).toBe('Future New Type')
    expect(humanizeEnum('multi_repo')).toBe('Multi Repo')
  })
})
