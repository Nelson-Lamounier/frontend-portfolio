---
title: Dependency security — Dependabot automation & transitive-vuln triage
type: concept
tags: [security, dependencies, dependabot, yarn, supply-chain, ci, vulnerabilities]
sources:
  - .github/dependabot.yml
  - .github/workflows/ci.yml
created: 2026-07-04
updated: 2026-07-04
---

## Overview

How dependency vulnerabilities are triaged and kept patched. The short version:
CI fails the build on high-severity advisories in the resolved tree, and
**Dependabot** opens grouped, CI-verified PRs for the rest — the transitive
advisories that accumulate in `yarn.lock`. Bumps land through a green,
deterministic gate rather than a hand-patched lockfile.

## Two audit sources (and why they disagree)

- **`yarn npm audit --all --severity high`** — run in CI
  ([ci.yml](../../.github/workflows/ci.yml)). Queries the npm registry audit API
  against the *resolved* tree and **fails the build** on a high+ advisory.
- **GitHub Dependabot** — uses the broader GitHub Advisory Database and reports
  per-manifest alerts against `yarn.lock`.

These legitimately disagree: a repo can be **clean** on `yarn npm audit` while
Dependabot lists dozens of alerts, because the Advisory DB flags transitive
packages the npm audit endpoint does not. That gap is expected — it is not a CI
misconfiguration.

## Triage — what the alerts actually are

A July 2026 review of the ~97 open alerts found **all of them are transitive**
(in `yarn.lock`, not direct dependencies), clustered in a handful of trees:

| Cluster | Example packages | Pulled by |
| --- | --- | --- |
| AWS SDK | `fast-xml-parser`, `fast-xml-builder`, `tar` | `@aws-sdk/*` |
| OpenTelemetry / gRPC | `protobufjs` (both criticals), `@grpc/grpc-js` | OTLP exporter |
| Build / test tooling | `minimatch`, `picomatch`, `flatted`, `ws`, `undici` | jest, etc. |
| MDX (Mermaid parser) | `lodash-es` | `chevrotain` |

Because they are transitive and mostly build/SDK tooling, none are directly
actionable via a `package.json` edit — they are fixed by updating the tree.

## Automation — the primary mechanism

[`.github/dependabot.yml`](../../.github/dependabot.yml) configures weekly,
grouped, CI-verified update PRs:

- A **`security-updates` group** rolls all (mostly transitive) security fixes into
  a **single PR**, gated by the full [CI pipeline](./ci-pipeline.md).
- Clustered `@aws-sdk/*` and `@opentelemetry/*` / `@grpc/*` version groups keep the
  noisy multi-package SDKs updating together.
- A `github-actions` ecosystem keeps the workflow actions patched.

Each PR runs lint, type-check, tests, and build before it can merge — so a bump
that breaks the suite is caught, not shipped. This is only reliable because the
test suite is now deterministic (see the note below).

## Manual recipe (verified) — if you need it now

Dependabot is the default path, but the same result can be applied directly. Yarn
4's `yarn up -R` upgrades transitives to the highest in-range version (fixing
advisories patched within the parent's semver range), and `resolutions` handles
exact-pinned stragglers:

```bash
# In-range transitive bumps (patch/minor within existing ranges)
yarn up -R undici ws @grpc/grpc-js protobufjs minimatch tar \
  picomatch flatted fast-xml-parser fast-xml-builder lodash-es
```

```jsonc
// package.json — for exact-pinned deps yarn up -R can't move
"resolutions": {
  "protobufjs@8.0.0": "8.0.2",   // OTel otlp-transformer pins exact
  "protobufjs@8.0.1": "8.0.2",
  "lodash-es@4.17.23": "4.18.1"  // chevrotain pins exact
}
```

This clears every critical/high (protobufjs → 7.6.5 / 8.0.2, undici → 7.28,
ws → 8.21, @grpc/grpc-js → 1.14.4, minimatch/tar/picomatch/flatted/fast-xml-* →
patched). **Always regenerate `yarn.lock` (`yarn install`) with the change and run
the full gate** — a lockfile edit re-hoists packages, which is exactly why the
test-transform determinism fix had to land first.

## Why automate instead of one bulk bump

A single manual bulk bump *works*, but any lockfile change re-hoists the ESM MDX
packages and previously tripped a **flaky test-transform bug** — the suite passed
or failed by luck of the hoist. That determinism bug is now fixed
([next/jest ESM transform](../troubleshooting/next-jest-esm-transform.md)), so
Dependabot's grouped PRs land through a reliable CI gate. Splitting the two —
stabilise the gate, then automate the bumps — keeps each change legible and each
merge safe.

## Related

- [CI pipeline & branch strategy](./ci-pipeline.md) — the gate every update PR passes
- [next/jest ESM transform](../troubleshooting/next-jest-esm-transform.md) — the determinism fix that made reliable bumps possible
- [Frontend development](./frontend-development.md) — the dependency stack being kept patched

<!--
Evidence trail (2026-07-04):
- yarn npm audit --all --severity high: clean (exit 0); Dependabot: 97 open (2 critical, 34 high, 53 moderate, 8 low), all transitive
- Clusters verified via GitHub dependabot/alerts API + yarn why
- Manual recipe verified to patch all critical/high; collided with flaky next/jest ESM transform until that was fixed
-->
