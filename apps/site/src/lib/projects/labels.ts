/**
 * labels.ts — human labels for Tucaken project enum values.
 *
 * The BFF returns raw enum strings (`production_saas`, `sole_builder`,
 * `multi_repo`). Known values get curated labels; unknown values fall
 * back to a generic humanisation instead of throwing, because the enum
 * set is owned by the producer (tucaken-app) and can grow without this
 * repo deploying in lockstep.
 */

const PROJECT_TYPE_LABELS: Record<string, string> = {
  side_project: 'Side Project',
  open_source: 'Open Source',
  production_saas: 'Production SaaS',
  client_work: 'Client Work',
  internal_tool: 'Internal Tool',
  learning_project: 'Learning Project',
}

/** `snake_case_enum` → `Snake Case Enum` for values without a curated label. */
export function humanizeEnum(value: string): string {
  return value
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Display label for a project `type` enum value. */
export function projectTypeLabel(type: string): string {
  return PROJECT_TYPE_LABELS[type] ?? humanizeEnum(type)
}
