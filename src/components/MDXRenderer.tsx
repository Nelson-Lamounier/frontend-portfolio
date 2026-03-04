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

import { Callout } from '@/components/Callout'
import { Mermaid } from '@/components/Mermaid'
import { ProcessTimeline } from '@/components/ProcessTimeline'
import { SmartImage } from '@/components/SmartImage'
import { ScenarioKeywords } from '@/components/ScenarioKeywords'
import { EliminationList } from '@/components/EliminationList'
import { ScreenshotPlaceholder } from '@/components/ScreenshotPlaceholder'

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
  ProcessTimeline,
  SmartImage,

  // Content callouts
  Callout,

  // Quiz / interactive components
  ScenarioKeywords,
  EliminationList,

  // Placeholder for future screenshots
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
    />
  )
}
