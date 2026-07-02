import { describe, it, expect } from '@jest/globals'
import { sanitizeMdx } from './sanitize-mdx'

describe('sanitizeMdx', () => {
  it('strips {#anchor} heading IDs (the acorn 500)', () => {
    const out = sanitizeMdx('## The Problem: Hallucination {#the-problem}\n\nbody')
    expect(out).toBe('## The Problem: Hallucination\n\nbody')
  })

  it('leaves non-heading {...} untouched', () => {
    const src = 'Use `toolChoice: { tool: { name: "x" } }` here.'
    expect(sanitizeMdx(src)).toBe(src)
  })

  it('rewrites MermaidChart props to a fenced block', () => {
    const out = sanitizeMdx('<MermaidChart chart={`\ngraph LR\nA-->B\n`} />')
    expect(out).toContain('```mermaid')
    expect(out).not.toContain('<MermaidChart')
  })

  it('strips EVIDENCE_GAP markers', () => {
    expect(sanitizeMdx('a <!-- EVIDENCE_GAP: thin --> b')).toBe('a  b')
  })

  it('strips anchors across multiple heading levels, once per line', () => {
    const src = '# T {#t}\n## A {#a}\n### B {#b-1}\ntext {#not-a-heading}'
    expect(sanitizeMdx(src)).toBe('# T\n## A\n### B\ntext {#not-a-heading}')
  })
})
