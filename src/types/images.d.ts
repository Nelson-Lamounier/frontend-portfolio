/**
 * Image Module Type Declarations
 *
 * Required for TypeScript to understand static image imports
 * (e.g., `import avatar from '@/images/avatar.jpg'`).
 *
 * Next.js provides these via `next-env.d.ts`, but that file is
 * gitignored because it's auto-generated. In CI environments where
 * `next dev` / `next build` hasn't run, the type declarations are
 * missing. This file ensures `yarn tsc --noEmit` works in CI without
 * needing a prior build step.
 */

declare module '*.png' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.jpg' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.jpeg' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.webp' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.gif' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.avif' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}

declare module '*.ico' {
  import type { StaticImageData } from 'next/image'
  const content: StaticImageData
  export default content
}
