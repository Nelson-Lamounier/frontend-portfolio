import { describe, it, expect } from '@jest/globals'
import { extractToc } from './extract-toc'

describe('extractToc', () => {
  it('extracts H2/H3 with matching github slugs, ignoring H1', () => {
    const md = [
      '# Title (not in TOC)',
      '## The Problem',
      'body',
      '### A Sub Point',
      '## Five Failures',
    ].join('\n')
    expect(extractToc(md)).toEqual([
      { depth: 2, text: 'The Problem', slug: 'the-problem' },
      { depth: 3, text: 'A Sub Point', slug: 'a-sub-point' },
      { depth: 2, text: 'Five Failures', slug: 'five-failures' },
    ])
  })

  it('skips headings inside fenced code blocks', () => {
    const md = ['## Real Heading', '```bash', '## not a heading', '```', '## Another'].join('\n')
    expect(extractToc(md).map((i) => i.text)).toEqual(['Real Heading', 'Another'])
  })

  it('strips inline markdown from the label', () => {
    const md = '## Using `kubectl describe` and **Pod Identity**'
    const [item] = extractToc(md)
    expect(item.text).toBe('Using kubectl describe and Pod Identity')
    expect(item.slug).toBe('using-kubectl-describe-and-pod-identity')
  })

  it('de-duplicates repeated headings like github-slugger', () => {
    const md = ['## Setup', '## Setup'].join('\n')
    expect(extractToc(md).map((i) => i.slug)).toEqual(['setup', 'setup-1'])
  })
})
