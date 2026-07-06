---
title: Coordinated Next 16 + TypeScript 6 migration; ESLint 10 deferred
type: decision
tags: [nextjs, typescript, eslint, dependencies, architecture]
sources:
  - apps/site/package.json
  - apps/site/next.config.mjs
created: 2026-07-05
updated: 2026-07-05
---

## Status

Accepted (2026-07-04, commit `cdf2c40`).

## Context

Dependabot opened four separate major-version PRs (#27/#30/#33/#34) for
Next 16, @next/mdx 16, eslint-config-next 16, and TypeScript 6. Majors in
this stack are interdependent — eslint-config-next 16 assumes Next 16's
flat-config export, @next/mdx 16 assumes Next 16's serializable-options
contract — so merging them independently would break CI between merges.

## Decision

One coordinated upgrade commit superseding the four Dependabot PRs, with
the breaking changes fixed together (commit `cdf2c40`):

- **MDX plugins by module name** — Next 16 / Turbopack requires
  serializable `@next/mdx` options, so remark/rehype plugins are
  referenced as strings rather than imported functions in `next.config`.
- **`middleware.ts` → `proxy.ts`** — the middleware file convention is
  deprecated in Next 16 in favour of `proxy` (file and function renamed).
- **Native flat config** — `eslint-config-next/core-web-vitals` replaces
  the removed `FlatCompat extends('next')`; explicit `@eslint/js` added;
  typescript-eslint bumped to 8.62.
- **`baseUrl` dropped** — deprecated in TS 6; `paths` resolve relative to
  the tsconfig.
- **Two experimental react-hooks v6 rules deferred**
  (`set-state-in-effect`, `refs`) because they flag established, correct
  patterns in this codebase (usePrevious, mount guards, timers).

**ESLint 10 was deliberately excluded**: eslint-plugin-react 7.37.5
(pulled by eslint-config-next 16) peer-caps at ESLint ^9.7 and crashes on
10, so ESLint stays on 9.39 until the plugin catches up.

## Consequences

The framework/language/linter trio moves in one reviewable, revertable
commit, verified green (build, lint, tsc on TS 6, 307/307 tests per the
commit message). The deferred hooks rules and the ESLint 10 exclusion are
recorded debt: re-evaluate both when eslint-plugin-react supports
ESLint 10.

## Alternatives considered

- **Merge the four Dependabot PRs sequentially** — rejected: each
  intermediate state fails CI because the majors assume each other.
- **Take ESLint 10 anyway** — rejected: eslint-plugin-react crashes on it;
  a broken linter gates every future PR.
- **Stay on Next 15 / TS 5** — rejected: the repo's dependency-security
  process (see [dependency-security](../concepts/dependency-security.md))
  keeps majors current to avoid compounding upgrade cliffs.

<!--
Evidence trail (auto-generated):
- Commit: cdf2c40 "chore(deps): migrate to Next 16, @next/mdx 16, eslint-config-next 16, TypeScript 6" (read on 2026-07-05)
- Source: apps/site/package.json (read on 2026-07-05)
-->
