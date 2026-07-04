---
title: CI pipeline & branch strategy
type: concept
tags: [ci, github-actions, testing, quality-gate, sonarcloud, branch-strategy, pull-request]
sources:
  - .github/workflows/ci.yml
  - .github/workflows/sonarqube.yml
  - .github/actions/setup-node-yarn/action.yml
created: 2026-07-04
updated: 2026-07-04
---

## Overview

GitHub Actions is the source of truth for this repository — it **leads** both
integration and delivery. Continuous Integration (CI) is the quality gate that
every change passes before it can reach `main`, and therefore before the
[CD pipeline](./cd-pipeline.md) can build and ship anything. CI never touches AWS
or the cluster; it only proves the code is safe to merge.

Two workflows make up CI:

- [`ci.yml`](../../.github/workflows/ci.yml) — the core pipeline: change
  detection, security audit, lint, type-check, unit tests, Next.js build, and a
  Docker build + container smoke test.
- [`sonarqube.yml`](../../.github/workflows/sonarqube.yml) — SonarCloud SAST and
  the coverage-based quality gate.

## What CI does

The core pipeline ([ci.yml](../../.github/workflows/ci.yml)) runs as a fan-out of
jobs behind a single change-detection job:

1. **detect-changes** — classifies the diff with `dorny/paths-filter` into
   `src`, `tests`, `styles`, `config`, and `docker` buckets, then computes two
   flags: `run-all` (any config/tooling change → run everything) and `run-docker`
   ([ci.yml:24-107](../../.github/workflows/ci.yml#L24-L107)).
2. **setup** — resolves the Node version (from `.nvmrc`, fallback `22`) and warms
   the Yarn dependency cache via the
   [`setup-node-yarn`](../../.github/actions/setup-node-yarn/action.yml) composite
   action ([ci.yml:112-138](../../.github/workflows/ci.yml#L112-L138)).
3. **audit** — `yarn npm audit --all --severity high` fails the build on a
   high-severity advisory ([ci.yml:143-166](../../.github/workflows/ci.yml#L143-L166)).
4. **lint** — ESLint with `--max-warnings 0`
   ([ci.yml:171-191](../../.github/workflows/ci.yml#L171-L191)).
5. **typecheck** — `tsc --noEmit`
   ([ci.yml:193-213](../../.github/workflows/ci.yml#L193-L213)).
6. **test** — Jest with coverage, uploaded as an artifact
   ([ci.yml:218-247](../../.github/workflows/ci.yml#L218-L247)).
7. **build** — `yarn build` and a check that `.next/` was produced
   ([ci.yml:252-287](../../.github/workflows/ci.yml#L252-L287)).
8. **docker-build** — builds the production image with Buildx + GHA layer cache,
   then runs the container and **smoke-tests the endpoints**: `/api/health`
   returns 200, `/api/metrics` returns 401 without a token and valid Prometheus
   output with one, all under a hard `--max-time`
   ([ci.yml:292-393](../../.github/workflows/ci.yml#L292-L393)).
9. **ci-success** — aggregates every job's result into one gate
   ([ci.yml:399-458](../../.github/workflows/ci.yml#L399-L458)).

SonarCloud runs in parallel on its own triggers: it does a full clone
(`fetch-depth: 0`), regenerates coverage, and reports SAST findings plus the
quality gate ([sonarqube.yml](../../.github/workflows/sonarqube.yml)).

## Design concept — why it is shaped this way

- **Path-filtered change detection.** A docs-only or workflow-only change should
  not spend minutes on a Docker build. `detect-changes` runs first (~10s) and
  every downstream job carries an `if:` guard on the relevant filter, so CI does
  the minimum work a given diff requires. A change to tooling/config trips
  `run-all`, because config changes can invalidate any assumption.
- **Fan-out behind one shared setup.** Dependencies install and cache once; lint,
  type-check, test, and build then run as independent parallel jobs. Failures are
  isolated (a lint failure doesn't mask a test failure) and the wall-clock is the
  slowest single job, not the sum.
- **One aggregated required check.** `ci-success` is the single status branch
  protection requires. It treats an intentionally *skipped* job as success but a
  *failed* or *cancelled* job as failure — so skipping the Docker build on a
  docs-only PR doesn't block the merge, while a real regression does.
- **The container smoke test is deliberate.** Building the image proves it
  compiles; running it proves it *boots*. The `/api/metrics` timeout check exists
  specifically to catch a blocking SSM/token call that would hang the pod in
  production but pass a static build
  ([ci.yml:356-386](../../.github/workflows/ci.yml#L356-L386)).
- **CI is credential-free.** It holds `contents: read` and never assumes an AWS
  role. All AWS interaction is the CD pipeline's job — see
  [CD pipeline](./cd-pipeline.md). This keeps the blast radius of a compromised CI
  run to the repository, not the cloud account.

## Git & branch strategy

The model is **trunk-based**: `main` is the single deployable trunk, and every
merge to it is a candidate for deployment.

- **Feature branches → PR → merge.** Work happens on short-lived branches with a
  typed prefix — `feat/`, `fix/`, `ci/`, `chore/`, `docs/` (e.g.
  `ci/remove-smoke-job`, `docs/portfolio-kb`). Each branch opens a Pull Request
  into `main`.
- **CI runs on every branch and every PR.** `ci.yml` triggers on `push` to any
  branch and on `pull_request` to any branch
  ([ci.yml:7-11](../../.github/workflows/ci.yml#L7-L11)), so a branch is validated
  both while you push to it and when it is proposed for merge.
- **SonarCloud gates PRs into `main`.** `sonarqube.yml` runs on PRs (and pushes)
  targeting `main`/`develop`
  ([sonarqube.yml:7-17](../../.github/workflows/sonarqube.yml#L7-L17)), adding the
  quality gate to the merge decision.
- **`main` is protected by the aggregated check.** A PR merges only once
  `ci-success` (and the SonarCloud gate) is green.
- **Merging to `main` is what triggers delivery.** A push to `main` — normally a
  PR merge — automatically starts the [CD pipeline](./cd-pipeline.md) against the
  development environment. There is no separate "release" action for dev.

This is why CI leads: nothing is built for delivery, pushed to ECR, or seen by
ArgoCD until a change has passed CI and landed on `main`.

## Related

- [CD pipeline](./cd-pipeline.md) — what happens after a merge to `main`
- [Frontend deploy pipeline runbook](../runbooks/frontend-deploy-pipeline.md) —
  operating a deploy
- [/api/metrics endpoint](../tools/metrics-endpoint.md) — the endpoint the
  container smoke test exercises

<!--
Evidence trail:
- Source: .github/workflows/ci.yml (read 2026-07-04)
- Source: .github/workflows/sonarqube.yml (read 2026-07-04)
- Source: .github/actions/setup-node-yarn/action.yml (read 2026-07-04)
- Branch model corroborated by merge history (typed-prefix branches → PR → main)
-->
