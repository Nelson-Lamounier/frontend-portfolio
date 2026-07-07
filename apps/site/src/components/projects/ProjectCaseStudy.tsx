/**
 * ProjectCaseStudy — full case-study renderer for /projects/[slug].
 *
 * Server Component port of tucaken-app's PublicCaseStudy, restyled with
 * this site's zinc/teal Card idiom. Renders the evidence-grounded payload
 * from the public-api BFF as-is: sections appear only when the pipeline
 * produced content for them, so a freshly published project with a
 * pending case study degrades to header + repositories rather than
 * rendering empty scaffolding.
 *
 * The architecture diagram delegates to the existing client-side Mermaid
 * component (dynamic import, sanitised SVG) — the only client boundary
 * on the page.
 */

import { Mermaid } from '@/components/articles'
import { humanizeEnum, projectTypeLabel } from '@/lib/projects'
import type {
  PublicCaseStudy,
  CaseStudyStackItem,
} from '@/lib/projects'

// =============================================================================
// SECTION PRIMITIVES
// =============================================================================

/** Uniform section wrapper: teal eyebrow heading + content block. */
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xs font-semibold tracking-widest text-teal-500 uppercase dark:text-teal-400">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Small rounded chip used for tags and metadata facts. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  )
}

// =============================================================================
// STACK GROUPING
// =============================================================================

/**
 * Group stack items by category preserving the pipeline's order_index
 * ordering. Category display order = first appearance in the ordered
 * list, so the producer controls prominence without this repo hardcoding
 * the (producer-owned) category enum.
 */
function groupStack(
  stack: CaseStudyStackItem[],
): Array<{ category: string; items: CaseStudyStackItem[] }> {
  const groups = new Map<string, CaseStudyStackItem[]>()
  for (const item of stack) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return [...groups.entries()].map(([category, items]) => ({
    category,
    items,
  }))
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProjectCaseStudy({ study }: { study: PublicCaseStudy }) {
  const stackGroups = groupStack(study.stack)

  return (
    <article className="mx-auto max-w-3xl">
      {/* Header: name, tagline, metadata chips */}
      <header>
        <p className="text-xs font-medium tracking-wide text-teal-500 uppercase dark:text-teal-400">
          {projectTypeLabel(study.type)}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
          {study.name}
        </h1>
        {study.tagline && (
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            {study.tagline}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip>{humanizeEnum(study.roleExhibited)}</Chip>
          <Chip>{humanizeEnum(study.shape)}</Chip>
          {study.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      </header>

      {study.pitch && (
        <Section title="Overview">
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {study.pitch}
          </p>
        </Section>
      )}

      {stackGroups.length > 0 && (
        <Section title="Stack">
          <dl className="space-y-4">
            {stackGroups.map((group) => (
              <div key={group.category}>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {humanizeEnum(group.category)}
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item.name}
                      title={item.justification ?? undefined}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {item.name}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {study.architecture?.diagram_format === 'mermaid' &&
        study.architecture.diagram_source && (
          <Section title="Architecture">
            <Mermaid chart={study.architecture.diagram_source} />
          </Section>
        )}

      {study.highlights.length > 0 && (
        <Section title="Highlights">
          <ul className="space-y-4">
            {study.highlights.map((h) => (
              <li key={h.title}>
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                  {h.title}
                </p>
                {h.description && (
                  <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {h.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {study.challenges.length > 0 && (
        <Section title="Challenges">
          <ul className="space-y-6">
            {study.challenges.map((c) => (
              <li key={c.problem}>
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                  {c.problem}
                </p>
                {c.solution && (
                  <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {c.solution}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {study.decisions.length > 0 && (
        <Section title="Key Decisions">
          <ul className="space-y-8">
            {study.decisions.map((d) => (
              <li key={d.title}>
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                  {d.title}
                </p>
                {d.context && (
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-500">
                    {d.context}
                  </p>
                )}
                {d.decision && (
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {d.decision}
                  </p>
                )}
                {d.consequences && (
                  <p className="mt-2 text-sm leading-6 text-zinc-600 italic dark:text-zinc-400">
                    {d.consequences}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {study.resumeBullets.length > 0 && (
        <Section title="What This Demonstrates">
          <div className="space-y-6">
            {study.resumeBullets.map((rb) => (
              <div key={rb.angle}>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {humanizeEnum(rb.angle)}
                </p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {rb.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {study.repositories.length > 0 && (
        <Section title="Repositories">
          <ul className="space-y-2">
            {/* De-duplicate: a multi-component project can link the same
                repo (different subpaths) more than once. */}
            {[...new Set(study.repositories.map((r) => r.repository_full_name))].map(
              (fullName) => (
                <li key={fullName}>
                  <a
                    href={`https://github.com/${fullName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    {fullName}
                  </a>
                </li>
              ),
            )}
          </ul>
        </Section>
      )}
    </article>
  )
}
