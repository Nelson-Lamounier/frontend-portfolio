/**
 * VideoRequest — Looping, muted video component for Bedrock-generated MDX
 *
 * Mirrors the ImageRequest pattern but renders a `<video>` tag optimised
 * for blog posts: autoPlay, loop, muted, playsInline (no controls by default).
 *
 * Resolution order:
 * 1. Local video at `/videos/articles/{id}.{mp4,webm}` (from public/)
 * 2. Fallback: amber placeholder showing the AI instruction
 *
 * Usage in MDX:
 *   <VideoRequest id="agent-conversation-loop" instruction="Animated loop showing the agent conversation cycle" />
 */

'use client'

import { useState } from 'react'

interface VideoRequestProps {
  /** Unique video identifier — maps to /videos/articles/{id}.mp4 in public/ */
  id: string
  /** AI-generated instruction describing the desired video content */
  instruction: string
  /** Optional video type hint (e.g. 'demo', 'diagram', 'screencast') */
  type?: string
  /** Optional contextual description for the video */
  context?: string
}

/**
 * Renders article videos with automatic source resolution and blog-optimised playback.
 *
 * Videos play silently on loop with no visible controls, behaving like
 * an animated illustration rather than a traditional video player.
 *
 * @param props - Video request properties
 * @returns Video element or styled placeholder
 */
export function VideoRequest({ id, instruction }: VideoRequestProps) {
  const [videoError, setVideoError] = useState(false)

  // Local video paths — try mp4 first, webm as fallback
  const mp4Url = `/videos/articles/${id}.mp4`
  const webmUrl = `/videos/articles/${id}.webm`

  // Placeholder when no video file is found
  if (videoError) {
    return (
      <figure className="my-8">
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/60 p-6 dark:border-violet-600 dark:bg-violet-950/20">
          <div className="text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
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
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
              Video Needed
            </span>
            <p className="mt-3 max-w-md text-sm font-medium text-violet-800 dark:text-violet-200">
              {instruction}
            </p>
            <code className="mt-2 inline-block rounded bg-violet-100/80 px-2 py-0.5 text-xs text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              ID: {id}
            </code>
          </div>
        </div>
      </figure>
    )
  }

  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700/50">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-auto w-full"
          onError={() => setVideoError(true)}
        >
          <source src={mp4Url} type="video/mp4" />
          <source src={webmUrl} type="video/webm" />
        </video>
      </div>
      <figcaption className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {instruction}
      </figcaption>
    </figure>
  )
}
