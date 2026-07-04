/**
 * Pre-compile sanitisation for pipeline-generated MDX. next-mdx-remote's acorn
 * parser is strict; the Writer emits a few constructs that are valid Markdown
 * but fatal to MDX v2. Each rule here rewrites one such construct so the article
 * compiles, without altering reader-visible content.
 */
export function sanitizeMdx(source: string): string {
  return (
    source
      // <MermaidChart chart={`...`} /> — multi-line template literals in JSX
      // props silently evaluate to `{}`; rewrite to a fenced mermaid block.
      .replace(/<MermaidChart\s+chart=\{\s*`([\s\S]*?)`\s*\}\s*\/>/g, '```mermaid\n$1\n```')
      // <!-- EVIDENCE_GAP: ... --> — internal QA marker, never reader content;
      // MDX v2 rejects raw HTML comments. Targeted so genuine `<!-- -->` inside
      // code samples survives.
      .replace(/<!--\s*EVIDENCE_GAP[\s\S]*?-->/gi, '')
      // `## Title {#anchor}` — explicit heading IDs. MDX reads `{#anchor}` as a
      // JSX expression and throws "Could not parse expression with acorn" (a hard
      // 500). rehype-slug regenerates IDs at render, so drop the annotation.
      // Anchored to heading lines, so `{...}` elsewhere is untouched.
      .replace(/^(#{1,6}[ \t].*?)[ \t]*\{#[\w-]+\}[ \t]*$/gm, '$1')
  )
}
