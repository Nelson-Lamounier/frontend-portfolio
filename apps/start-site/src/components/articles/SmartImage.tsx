/**
 * SmartImage — Server Component (RSC)
 *
 * Renders images with auto-fetched JSON sidecar metadata from S3.
 * At SSR time, derives the sidecar URL from the image src, fetches it,
 * Zod-validates the response, and renders next/image with the correct
 * alt text, dimensions, and optional blur placeholder.
 *
 * Falls back to fallbackAlt and intrinsic sizing if sidecar fetch fails.
 */

import type { SmartImageProps } from '@/lib/types/content-blocks'
import { safeValidateSidecar } from '@/lib/types/content-schemas'

// ========================================
// Sidecar URL Derivation
// ========================================

/**
 * Derives the sidecar JSON URL from an image URL.
 * Example: "https://cdn.example.com/articles/slug/images/hero.webp"
 *       → "https://cdn.example.com/articles/slug/images/hero.json"
 */
function deriveSidecarUrl(imageUrl: string): string {
  return imageUrl.replace(/\.(webp|png|jpg|jpeg|gif|avif)$/i, '.json')
}

// ========================================
// Sidecar Fetch (SSR-only)
// ========================================

interface SidecarData {
  alt: string
  width: number
  height: number
  blurHash?: string
  caption?: string
}

async function fetchSidecar(
  sidecarUrl: string,
): Promise<SidecarData | null> {
  try {
    const res = await fetch(sidecarUrl)

    if (!res.ok) return null

    const raw: unknown = await res.json()
    const result = safeValidateSidecar(raw)

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.warn(
        `[SmartImage] Invalid sidecar at ${sidecarUrl}:`,
        result.error.issues,
      )
      return null
    }

    return result.data
  } catch {
    // Network error or JSON parse failure — fall back gracefully
    return null
  }
}

// ========================================
// SmartImage Component
// ========================================

export async function SmartImage({
  src,
  fallbackAlt = '',
  className,
  caption: captionOverride,
}: SmartImageProps) {
  const sidecarUrl = deriveSidecarUrl(src)
  const sidecar = await fetchSidecar(sidecarUrl)

  const alt = sidecar?.alt ?? fallbackAlt
  const width = sidecar?.width ?? 1200
  const height = sidecar?.height ?? 630
  const caption = captionOverride ?? sidecar?.caption

  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className ?? 'w-full'}
          loading="lazy"
          decoding="async"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 flex items-start gap-3 px-1">
          <div className="mt-0.5 h-4 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-teal-500 to-emerald-500" />
          <span className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {caption}
          </span>
        </figcaption>
      )}
    </figure>
  )
}
