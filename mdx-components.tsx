import Image, { type ImageProps } from 'next/image'
import { type MDXComponents } from 'mdx/types'
import { Callout } from '@/components/Callout'
import { Mermaid } from '@/components/Mermaid'
import { ProcessTimeline } from '@/components/ProcessTimeline'
import { ScreenshotPlaceholder } from '@/components/ScreenshotPlaceholder'

export function useMDXComponents(components: MDXComponents) {
  return {
    ...components,
    Image: (props: ImageProps) => <Image {...props} />,
    Callout,
    Mermaid,
    ProcessTimeline,
    ScreenshotPlaceholder,
  }
}
