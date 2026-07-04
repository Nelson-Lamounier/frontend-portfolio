# CLAUDE.md — frontend-portfolio

Project instructions for Claude Code. See [README.md](README.md) for architecture
and [docs/](docs/README.md) for concepts, runbooks, and troubleshooting.

## Code comments (required for all new/changed code)

Any new or modified code **must** be well commented. Comments explain **why**, not
what — the reader can see what the code does; they cannot see the reasoning,
constraints, or tradeoffs behind it. Match the existing convention in
`apps/site/src/lib/` (e.g. `articles/article-service.ts`,
`observability/faro.ts`, `rate-limiter.ts`), which is the standard for this repo.

**Every new source file** gets a file-level doc header (`/** … */`) covering:

- **What** the module is responsible for (one or two sentences).
- **Why** it exists / the key decision behind it, when non-obvious.
- **Gotchas** — data source, upstream contract, env vars, or constraints a
  future editor must know (e.g. "reads the in-cluster `public-api` BFF; holds no
  AWS credentials"; "runs at build time with no cluster access").

**Every exported function, hook, component, and type** gets JSDoc: a one-line
purpose plus `@param`/`@returns` where the signature isn't self-evident. Add
`@example` for utilities with non-obvious call patterns (see `rate-limiter.ts`).

**Inline comments** are required wherever intent isn't obvious from the code:

- Non-obvious decisions and tradeoffs — explain the choice and the alternative
  rejected (e.g. why a read returns `[]` instead of throwing, why a timeout has
  specific headroom, why a synthetic value satisfies a schema).
- Framework/runtime gotchas — hydration guards, SSR vs. client boundaries,
  ISR/build-time behaviour, Edge-runtime constraints.
- Any `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` **must** carry a
  one-line reason on the same or preceding line.
- Non-trivial React components (theme/scroll/animation logic, complex state)
  need section comments, not just JSX.

**Do not** write comments that restate the code (`// increment counter` above
`counter++`) — that is noise. Prefer no comment over a redundant one, and a
comment explaining *why* over one describing *what*.

## Keep comments true

A wrong comment is worse than no comment. When you change behaviour, update every
comment, JSDoc, and metric `help`/label string that describes it. Watch for
documentation drift after refactors — e.g. data-source labels, upstream
contracts, and env-var names that silently become stale (see the RDS/BFF
migration; the site makes **no direct DynamoDB/S3 calls at runtime**).

## Before completing a code change

Run the same gates CI runs, from the repo root:

```bash
yarn lint
yarn workspace site exec tsc --noEmit
yarn test --ci --runInBand --watchman=false
```

Prometheus metric **names** are scraped identifiers — relabel/comment them, but
do not rename them without checking dashboards and alerts.
