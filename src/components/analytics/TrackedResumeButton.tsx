/** @format */

'use client'

import { trackResumeDownload } from '@/lib/analytics'

/**
 * Client component that wraps the resume download button
 * to fire a GA event when clicked.
 *
 * The resume is served from an S3 bucket (cross-origin),
 * so GA4's automatic file_download may not fire — this
 * custom event ensures reliable tracking.
 */
export function TrackedResumeButton({
  children,
  resumeUrl,
}: {
  children: React.ReactNode
  resumeUrl?: string
}) {
  const handleClick = () => {
    trackResumeDownload(resumeUrl)
  }

  return (
    <span onClick={handleClick} className="contents">
      {children}
    </span>
  )
}
