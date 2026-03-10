/**
 * MDXRenderer — Server Component
 *
 * Compiles and renders S3-fetched MDX content with the full
 * custom component library. This is the rendering engine for
 * the new [slug] dynamic route — it replaces file-based MDX
 * imports with runtime compilation via next-mdx-remote.
 *
 * Component mapping ensures visual consistency with existing
 * file-based articles.
 */

import { MDXRemote } from 'next-mdx-remote/rsc'

import { Callout } from './Callout'
import { CodeBlock } from './CodeBlock'
import { ImageRequest } from './ImageRequest'
import { Mermaid } from './Mermaid'
import { ProcessTimeline } from './ProcessTimeline'
import { SmartImage } from './SmartImage'
import { ScenarioKeywords } from './ScenarioKeywords'
import { EliminationList } from './EliminationList'
import { ScreenshotPlaceholder } from './ScreenshotPlaceholder'

// ========================================
// MDX Component Map
// ========================================

/**
 * Custom components available inside S3-hosted MDX articles.
 * These are the same components used in file-based articles,
 * ensuring visual consistency across both rendering paths.
 */
const mdxComponents = {
  // Interactive / data visualization
  Mermaid,
  MermaidChart: Mermaid, // Bedrock uses <MermaidChart>, alias to same component
  ProcessTimeline,
  SmartImage,

  // Content callouts
  Callout,

  // Code blocks — syntax highlighting + Mermaid delegation
  pre: CodeBlock,

  // Bedrock screenshot placeholders (prod image / dev placeholder)
  ImageRequest,

  // Quiz / interactive components
  ScenarioKeywords,
  EliminationList,

  // Legacy screenshot placeholder
  ScreenshotPlaceholder,
}

// ========================================
// Props
// ========================================

interface MDXRendererProps {
  /** Raw MDX string fetched from S3 */
  source: string
}

// ========================================
// Component
// ========================================

/**
 * Server component that compiles raw MDX and renders it with
 * the full component library. Used by the dynamic [slug] route.
 *
 * @example
 * ```tsx
 * // In [slug]/page.tsx
 * const content = await fetchArticleContent(metadata.contentRef)
 * return <MDXRenderer source={content.content} />
 * ```
 */
export function MDXRenderer({ source }: MDXRendererProps) {
  return (
    <MDXRemote
      source={source}
      components={mdxComponents}
      options={{
        parseFrontmatter: true,
      }}
    />
  )
}
