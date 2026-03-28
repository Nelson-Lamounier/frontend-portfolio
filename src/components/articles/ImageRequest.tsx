/**
 * ImageRequest — Multi-format image component for Bedrock-generated MDX
 *
 * Resolves article images via CloudFront with extension fallback:
 *   1. `/images/articles/{id}.jpeg` — most common for photographs
 *   2. `/images/articles/{id}.png` — screenshots and diagrams with transparency
 *   3. `/images/articles/{id}.webp` — modern format for optimised delivery
 *   4. Fallback: amber placeholder showing the AI instruction
 *
 * In both development and production, images are served via CloudFront
 * paths (`/images/*`) which route to the S3 assets bucket. This works
 * because:
 *   - Dev: `next dev` serves from `public/images/articles/`
 *   - Prod: CloudFront routes `/images/*` to S3 origin
 *
 * Usage in MDX:
 *   <ImageRequest id="eks-dashboard-overview" instruction="Screenshot of the EKS dashboard showing running pods" />
 */

'use client'

import { useState } from 'react'

/** Supported image extensions, tried in priority order */
const IMAGE_EXTENSIONS = ['jpeg', 'png', 'webp'] as const

interface ImageRequestProps {
  /** Unique image identifier — maps to `/images/articles/{id}.{ext}` */
  id: string
  /** AI-generated instruction describing the desired screenshot */
  instruction: string
  /** Optional image type hint (e.g. 'hero', 'diagram') */
  type?: string
  /** Optional context string for the image */
  context?: string
}

/**
 * Renders article images with automatic multi-format source resolution.
 *
 * Tries each extension in order and falls back to a styled placeholder
 * if no image is found at any supported path.
 *
 * @param props - Image request properties
 * @returns Image element or styled placeholder
 */
export function ImageRequest({ id, instruction }: ImageRequestProps) {
  const [extIndex, setExtIndex] = useState(0)
  const [imgError, setImgError] = useState(false)

  // Build the CloudFront-routed URL using the current extension candidate
  const imageUrl = `/images/articles/${id}.${IMAGE_EXTENSIONS[extIndex]}`

  /**
   * Handle image load failure — try the next extension in the
   * fallback chain, or show the placeholder if all formats exhausted.
   */
  const handleError = () => {
    if (extIndex < IMAGE_EXTENSIONS.length - 1) {
      setExtIndex((prev) => prev + 1)
    } else {
      setImgError(true)
    }
  }

  // All extensions exhausted — render the placeholder
  if (imgError) {
    return (
      <figure className="my-8">
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-6 dark:border-amber-600 dark:bg-amber-950/20">
          <div className="text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                />
              </svg>
              Screenshot Needed
            </span>
            <p className="mt-3 max-w-md text-sm font-medium text-amber-800 dark:text-amber-200">
              {instruction}
            </p>
            <code className="mt-2 inline-block rounded bg-amber-100/80 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              ID: {id}
            </code>
          </div>
        </div>
      </figure>
    )
  }

  // Render the image via CloudFront path (works in both dev and prod)
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imageUrl}
          src={imageUrl}
          alt={instruction}
          loading="lazy"
          className="h-auto w-full"
          onError={handleError}
        />
      </div>
      <figcaption className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {instruction}
      </figcaption>
    </figure>
  )
}
