'use client'

/**
 * DynamicArticleContent - Renders MDX content from DynamoDB
 * 
 * This component handles rendering article content fetched from DynamoDB,
 * including custom components (ScenarioKeywords, EliminationList) and images.
 * 
 * For file-based articles (during migration), the parent page should
 * render the MDX content directly instead of using this component.
 */

import { useMemo } from 'react'
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote'
import Image from 'next/image'

import { Prose } from '@/components/Prose'
import { ScenarioKeywords } from '@/components/ScenarioKeywords'
import { EliminationList } from '@/components/EliminationList'
import type { ArticleContent, ArticleImage } from '@/lib/types/article.types'

// ========================================
// Types
// ========================================

interface DynamicArticleContentProps {
  content: ArticleContent
  serializedContent: MDXRemoteSerializeResult
}

interface ImageComponentProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

// ========================================
// Image Component Factory
// ========================================

/**
 * Creates an Image component that resolves image IDs to CloudFront URLs
 */
function createImageComponent(images: ArticleImage[]) {
  const imageMap = new Map(images.map((img) => [img.id, img]))

  return function DynamicImage({
    src,
    alt,
    className,
    width,
    height,
    ...props
  }: ImageComponentProps) {
    // Check if src is an image ID reference
    const image = imageMap.get(src)

    if (image) {
      return (
        <Image
          src={image.url}
          alt={image.alt || alt}
          width={image.width || width || 800}
          height={image.height || height || 600}
          className={className || 'h-auto w-full'}
          {...props}
        />
      )
    }

    // Check if src starts with http (direct URL)
    if (src.startsWith('http')) {
      return (
        <Image
          src={src}
          alt={alt}
          width={width || 800}
          height={height || 600}
          className={className || 'h-auto w-full'}
          {...props}
        />
      )
    }

    // Fallback: render as regular img for relative paths
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className || 'h-auto w-full'}
        {...props}
      />
    )
  }
}

// ========================================
// Component
// ========================================

export function DynamicArticleContent({
  content,
  serializedContent,
}: DynamicArticleContentProps) {
  // Create MDX components with image resolution
  const components = useMemo(
    () => ({
      // Custom article components
      ScenarioKeywords,
      EliminationList,

      // Dynamic image component
      Image: createImageComponent(content.images || []),

      // Standard HTML element overrides
      img: createImageComponent(content.images || []),

      // Code block styling (handled by rehype-prism)
      pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
        <pre className="overflow-x-auto" {...props}>
          {children}
        </pre>
      ),

      // Link styling
      a: ({
        href,
        children,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          href={href}
          className="text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
        </a>
      ),
    }),
    [content.images]
  )

  return (
    <Prose className="mt-8" data-mdx-content>
      <MDXRemote {...serializedContent} components={components} />
    </Prose>
  )
}

// ========================================
// Exports
// ========================================

export type { DynamicArticleContentProps }
