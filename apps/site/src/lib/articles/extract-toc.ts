/**
 * Build a table of contents from raw MDX. The article pipeline no longer emits
 * a manual TOC (it is a rendering-layer concern), so in-page navigation is
 * generated here from the H2/H3 heading tree.
 *
 * Slugs use the same algorithm as github-slugger — the slugger `rehype-slug`
 * applies when it stamps heading `id`s at render — so the anchor links line up.
 * The algorithm is inlined (a few lines) rather than imported to avoid pulling
 * an ESM-only package into the Jest/CJS test path.
 */

export interface TocItem {
  readonly depth: 2 | 3
  readonly text: string
  readonly slug: string
}

// github-slugger's special-character class, built from ASCII escapes so no
// irregular-whitespace codepoints appear literally in source. Regular spaces
// are NOT in this class — they become hyphens in a later step.
const GITHUB_SPECIALS = new RegExp(
  '[\\u2000-\\u206F\\u2E00-\\u2E7F\\\\\'!"#$%&()*+,./:;<=>?@\\[\\]^`{|}~\\u2019]',
  'g',
)

/** Deterministic github-compatible slugger with duplicate suffixing. */
class Slugger {
  private readonly seen = new Map<string, number>()

  slug(text: string): string {
    const base = text.toLowerCase().replace(GITHUB_SPECIALS, '').replaceAll(' ', '-')
    const n = this.seen.get(base) ?? 0
    this.seen.set(base, n + 1)
    return n === 0 ? base : `${base}-${n}`
  }
}

/** Strip inline markdown so the TOC label reads as plain text. */
function cleanHeading(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')             // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // bold
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> label only
    .replace(/#+\s*$/, '')                   // trailing closing hashes
    .trim()
}

/** Extract H2/H3 headings (skipping fenced code) into a flat TOC list. */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new Slugger()
  const items: TocItem[] = []
  let inFence = false

  for (const raw of markdown.split('\n')) {
    if (raw.trim().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const m = /^(#{2,3})\s+(.+)$/.exec(raw)
    if (!m) continue

    const text = cleanHeading(m[2])
    if (!text) continue
    const depth = m[1].length === 2 ? 2 : 3
    items.push({ depth, text, slug: slugger.slug(text) })
  }

  return items
}
