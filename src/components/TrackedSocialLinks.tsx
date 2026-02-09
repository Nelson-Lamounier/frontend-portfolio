/** @format */

'use client'

import { useEffect, useCallback } from 'react'
import { trackSocialClick } from '@/lib/analytics'

/**
 * Detects the social platform from a URL or aria-label
 */
function detectPlatform(href: string, ariaLabel?: string): string {
  const label = (ariaLabel || '').toLowerCase()
  const url = href.toLowerCase()

  if (url.includes('github.com') || label.includes('github')) return 'github'
  if (url.includes('linkedin.com') || label.includes('linkedin'))
    return 'linkedin'
  if (url.includes('twitter.com') || url.includes('x.com') || label.includes(' x'))
    return 'x'
  if (url.includes('instagram.com') || label.includes('instagram'))
    return 'instagram'
  if (href.startsWith('mailto:')) return 'email'

  return 'unknown'
}

/**
 * Wrapper that adds GA social click tracking to any children rendered as social links.
 * Place this component around a group of social link elements in a Server Component page.
 *
 * It uses event delegation on the container to capture clicks on <a> tags,
 * so it works with any link structure without requiring changes to the link components.
 */
export function TrackedSocialLinks({
  children,
}: {
  children: React.ReactNode
}) {
  const handleClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href') || ''
    const ariaLabel = anchor.getAttribute('aria-label') || ''

    // Only track external social links (not internal navigation)
    if (href === '#' || href.startsWith('/')) return

    const platform = detectPlatform(href, ariaLabel)
    trackSocialClick(platform, href)
  }, [])

  useEffect(() => {
    // We use a ref-less approach: attach handler to document and filter
    // This component captures clicks via event delegation
    return () => {
      // Cleanup is handled by React
    }
  }, [])

  return (
    <span onClick={handleClick as unknown as React.MouseEventHandler} className="contents">
      {children}
    </span>
  )
}
