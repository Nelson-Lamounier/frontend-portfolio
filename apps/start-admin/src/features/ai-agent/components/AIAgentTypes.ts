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
