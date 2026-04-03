import Image, { type ImageProps } from 'next/image'
import { type MDXComponents } from 'mdx/types'
import { Callout, Mermaid, ProcessTimeline, ScreenshotPlaceholder } from '@/components/articles'

export function useMDXComponents(components: MDXComponents) {
  return {
    ...components,
    Image: ({ alt, ...rest }: ImageProps) => <Image alt={alt} {...rest} />,
    Callout,
    Mermaid,
    ProcessTimeline,
    ScreenshotPlaceholder,
  }
}
