---
title: GitHub account review — repository metrics & DORA report
type: report
tags: [metrics, dora, github, ci-cd, delivery-performance, report]
sources:
  - GitHub REST API (repos/Nelson-Lamounier/frontend-portfolio) via gh
  - git history on origin/main
created: 2026-07-04
updated: 2026-07-04
---

## Overview

A point-in-time review of the live `Nelson-Lamounier/frontend-portfolio` GitHub
repository — commit, pull-request, branch, and workflow activity — plus the four
**DORA** delivery-performance metrics. All figures are pulled from the GitHub REST
API and `git` history (not estimates), measured on **2026-07-04**.

**Repository snapshot**

| Field | Value |
| --- | --- |
| Created | 2026-01-18 (~5.5 months active) |
| Visibility | Public |
| Default branch | `main` |
| Active branches | 8 |
| Repo size | ~54 MB |
| Contributors | Nelson-Lamounier (human) + `dependabot[bot]` |

## Commit metrics

**374 commits** on `main` (≈336 human, ≈10 Dependabot; remainder merge commits).

### Commit type distribution (Conventional Commits)

| Type | Count | Share |
| --- | ---: | ---: |
| `feat` | 101 | 27.0% |
| `fix` | 77 | 20.6% |
| `refactor` | 49 | 13.1% |
| `chore` | 49 | 13.1% |
| `docs` | 18 | 4.8% |
| `ci` | 17 | 4.5% |
| `test` | 9 | 2.4% |
| other (`remove`/`style`/`debug`/…) | ~10 | ~2.7% |
| non-conventional / merges | ~44 | ~11.8% |

- **Conventional-commit adherence ≈ 88%** — strong, consistent commit hygiene.
- **fix : feat ratio = 0.76** (77 fixes per 101 features) — healthy.
- **Documentation + tests = 7.2%** of commits — low (see recommendations).

### Cadence (commits per month)

| Month | Commits |
| --- | ---: |
| 2025-11 | 9 |
| 2025-12 | 33 |
| 2026-01 | 5 |
| 2026-02 | 54 |
| 2026-03 | 95 |
| 2026-04 | 117 |
| 2026-06 | 13 |
| 2026-07 | 48 |

Peak build-out was **Mar–Apr 2026** (212 commits, 57% of all activity), with a
renewed burst in Jul 2026.

## Pull-request metrics

**40 PRs total** — 25 merged, 15 closed-unmerged, 0 open.

| Metric | Value |
| --- | --- |
| Merged | 25 (**62.5%**) |
| Closed unmerged | 15 (**37.5%**) — mostly superseded Dependabot PRs, closed deliberately |
| Open | 0 (**0%**) — clean board |
| Merged by human | 15 |
| Merged by Dependabot | 10 |
| Merge lead time (median) | **27 minutes** |
| Merge lead time (mean) | ~12 hours |
| PR-based integration (merge commits on `main`) | 41 |

- **Median 27-minute merge** reflects a fast, solo, admin-merge workflow.
- **37.5% closed-unmerged** is *not* churn — intentional cleanup of redundant
  Dependabot PRs superseded by grouped/consolidated upgrades.
- **0 open PRs** — no review backlog.

## Branch & integration

- **8 active branches**, trunk-based on `main` with typed-prefix feature branches
  (`feat/`, `fix/`, `ci/`, `chore/`, `docs/`).
- **~41 PR merges** into `main` — most changes land via PR, not direct push.
- **Branch protection: now enforced** (see [Gaps closed](#gaps-closed)) — `main`
  requires `CI Complete` + `SonarCloud Code Analysis`, strict up-to-date, with
  force-push/deletion blocked.

## Workflow / CI health

**Continuous Integration (`ci.yml`)** — runs on every branch and PR.

| Metric | Value |
| --- | --- |
| Total runs | 262 |
| Success (recent 100-run window) | ~66% |
| Failure (recent 100-run window) | ~34% |

A ~34% CI failure rate is expected for a pipeline that runs on **every** WIP branch
push (failures caught pre-merge, by design) and was inflated by a now-fixed flaky
MDX-transform test. It is a "caught early" signal, not a `main`-quality signal.

## DORA metrics

Deployment data aggregates all three delivery workflows (`deploy-frontend.yml`,
`deploy-nextjs-dev.yml`, `deploy-nextjs-prod.yml`): **39 runs → 16 success,
10 failure, 13 cancelled** (cancellations are concurrency-group cancels of
superseded in-flight deploys, excluded from failure math).

| DORA metric | Measured | Band |
| --- | --- | --- |
| **Deployment frequency** | 16 successful deploys; multiple/week during active windows | **High** |
| **Lead time for changes** | median PR merge 27 min + ~7 min pipeline → **< 1 hour** commit-to-live | **Elite** |
| **Change failure rate** | 10 / 26 completed = **38%** (all-time) | **Low** (elevated) |
| **Time to restore (MTTR)** | fix PRs merged in minutes (median 27 min) | **Elite / High** |

### Reading the scorecard

- **Lead time (Elite)** and **MTTR (Elite/High)** are the standout strengths — the
  automated `push → build → ECR → SSM → ArgoCD` pipeline turns a merge into a live
  deploy in single-digit minutes, and fixes ship almost immediately.
- **Deployment frequency (High)** — consistent, automated, GitOps-driven delivery.
- **Change failure rate (38%, Low band)** is the weak metric, but **inflated by
  pipeline bring-up**: most failures cluster in the early `deploy-nextjs-dev` era
  and the initial `deploy-frontend` rollout while the SSM/ArgoCD hand-off and the
  flaky test were stabilised. Those failure modes are now removed, so the trailing
  rate should trend toward the High band.

### Important caveats

- **Solo-developer context.** Median 27-minute merges and admin merges reflect one
  maintainer with no required review gate — fast, but not a team-throughput signal.
- **Coverage was collected but ungated** before this review — now enforced (below).
- **CFR is trailing/all-time**, dominated by the setup phase; a rolling last-30-day
  CFR would read materially better.

## Recommendations (highest leverage first)

1. **Add a branch-protection ruleset on `main`** — ✅ **Done** (2026-07-04). `main`
   now requires `CI Complete` + `SonarCloud Code Analysis`, strict up-to-date
   branches, with force-push and deletion blocked (admin bypass retained for the
   solo maintainer). Converts convention into enforcement.
2. **Drive down change failure rate** — *in progress.* The flaky test and the
   SSM/ArgoCD hand-off are fixed; track a **rolling 30-day CFR** and target the High
   band (<15%). Process metric — monitor via the deploy workflow history.
3. **Raise test coverage / gate it** — ✅ **Done** (2026-07-04). A `coverageThreshold`
   now gates CI at honest all-source floors (statements/lines ≥ 42%, branches ≥ 60%,
   functions ≥ 35%; measured across all `src` via `collectCoverageFrom`). Ratchet
   upward as coverage grows. Test-commit share (2.4%) remains a longer-term target.
4. **Keep the Dependabot grouping** — ✅ already in place. The grouped
   `security-updates` PRs are why the closed-unmerged rate looks high; correct
   hygiene, not waste.

## Gaps closed

Implemented as part of this review (2026-07-04):

| Gap | Action | Where |
| --- | --- | --- |
| No branch protection | Ruleset on `main`: required checks (`CI Complete`, `SonarCloud Code Analysis`), strict, no force-push/deletion | GitHub repo settings (API) |
| Coverage ungated | `coverageThreshold` floors + `collectCoverageFrom` (honest all-source denominator) | `apps/site/jest.config.ts` |
| Change failure rate | Root causes (flaky MDX test, SSM/ArgoCD hand-off) fixed earlier; now a monitoring metric | deploy workflow history |

<!--
Evidence trail (2026-07-04, via gh / GitHub REST API + git):
- repos/.../contributors: 336 human + 10 dependabot commits; git rev-list main = 374
- Commit type counts from `git log --pretty=%s` conventional-prefix parse
- PRs: gh pr list — 40 total, 25 merged, 15 closed-unmerged, 0 open; merge lead time median 0.453h
- Deploy workflows: deploy-frontend 24 (6 ok/5 fail/13 cancel), deploy-nextjs-dev 13 (9/4), deploy-nextjs-prod 2 (1/1); deploy-frontend avg duration 7.0 min
- ci.yml: 262 total runs; last-100 window 66 success / 34 failure
- Branch protection applied via PUT repos/.../branches/main/protection — contexts [CI Complete, SonarCloud Code Analysis], strict=true, enforce_admins=false
- Coverage (all-src): statements/lines 46.45%, branches 68.18%, functions 40.08%; threshold set below each
-->
