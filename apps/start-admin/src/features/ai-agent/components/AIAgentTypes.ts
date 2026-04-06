import type { ReactNode } from 'react'
import type { PipelineState } from '@/lib/api/admin-api'

export type AgentMode = 'upload' | 'paste' | 'pipeline' | 'test'

export interface DraftFile {
  readonly name: string
  readonly content: string
  readonly size: number
  readonly preview: string
}

export const PREVIEW_LINE_COUNT = 8
export const MIN_PASTE_CONTENT_LENGTH = 20
export const BYTES_PER_KB = 1024

export interface PipelineStage {
  readonly key: PipelineState
  readonly label: string
  readonly description: string
  readonly icon: ReactNode
}

export function getStageIndex(state: PipelineState): number {
  if (state === 'pending') return 0
  if (state === 'processing') return 1
  if (state === 'review') return 2
  if (state === 'published') return 3
  if (state === 'rejected' || state === 'failed') return 2
  return -1
}

export function slugifyFilename(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return base ? `${base}.md` : ''
}
