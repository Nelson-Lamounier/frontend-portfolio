---
title: Troubleshooting guide & automation
type: guide
tags: [troubleshooting, operations, justfile, automation, kubectl, local-dev, diagnostics]
sources:
  - justfile
  - scripts/local-dev.ts
  - scripts/sync-static-to-s3.ts
created: 2026-07-04
updated: 2026-07-04
---

## Overview

How to diagnose and fix problems in this application — from a failing local build
to the live site not serving data. The guiding principle is **reproduce as close
to production as possible, as locally as possible**, then climb toward the cluster
only when needed.

There are **no standalone shell scripts** in this repo by design. All automation
is either a [`justfile`](../../justfile) recipe (the hub) or a TypeScript
orchestrator run with `tsx`. This keeps automation typed, cross-platform, and
reviewable like the rest of the code.

## Automation inventory

### `just` recipes (the automation hub)

Run `just` with no args to list everything. The recipes:

| Recipe | What it does | Use when |
| --- | --- | --- |
| `just ci` | audit → lint → typecheck → test → build (the full CI gate locally) | Before pushing; reproducing a red CI run |
| `just audit` / `lint` / `typecheck` / `test` / `build` | individual CI steps | Isolating which gate fails |
| `just site-up [profile]` | stop → **build** → run the production Docker image locally, wait for `/api/health` | Reproduce the container exactly as CI/prod builds it |
| `just site-fast` | same, but skip the Docker build (cached image) | Fast restarts |
| `just site-logs` | build → run → tail container logs | Watching runtime logs |
| `just site-down` | stop & remove the local site container | Cleanup |
| `just site-rds [profile] [region] [port]` | **port-forward the in-cluster `public-api` BFF** and run `next dev` against **real dev RDS** | Debug data/chat issues against live data (see the [cluster-access runbook](./local-dev-and-cluster-access.md)) |
| `just docker-test-site` | build + run the image exactly like the CI smoke test | Reproduce a CI Docker-build failure |
| `just build-site` / `start-site` | build / start the site workspace | Manual prod-mode run |

### TypeScript orchestrators (`scripts/`)

| Script | Role |
| --- | --- |
| [`scripts/local-dev.ts`](../../scripts/local-dev.ts) | Builds/runs the site Docker image locally and polls `docker inspect` health until `/api/health` passes; backs `just site-up/fast/logs/down` |
| [`scripts/sync-static-to-s3.ts`](../../scripts/sync-static-to-s3.ts) | CD asset sync — uploads `.next/static` to S3 (CloudFront retired; invalidation step removed) |
| [`apps/site/scripts/seed-resumes.ts`](../../apps/site/scripts/seed-resumes.ts) | Seeds resume data for local/dev |

## The troubleshooting workflow

Climb only as far as the symptom requires:

1. **Reproduce locally, no cluster.** `just ci` for build/lint/type/test failures;
   `just site-up` (or `just docker-test-site`) to reproduce the **container** —
   this catches boot failures a static build misses (the same reason CI runs a
   container smoke test — see [CI pipeline](../concepts/ci-pipeline.md)).
2. **Reproduce against real data.** If the bug involves articles, chat, resume, or
   engagement, run `just site-rds` — it port-forwards the in-cluster BFF and points
   `PUBLIC_API_URL` at the tunnel, so `next dev` serves **real dev RDS** data with
   hot reload. See the [cluster-access runbook](./local-dev-and-cluster-access.md).
3. **Inspect the cluster.** Only if the issue is deployment/rollout/networking, use
   `kubectl`/`aws` against the cluster — see the runbooks below.

## Symptom → where to look

| Symptom | Likely area | Start here |
| --- | --- | --- |
| Lint / type / test / build fails | code | `just ci`, then the failing step |
| MDX test suite fails "Unexpected token 'export'" (flaky) | jest ESM transform | [next/jest ESM transform](./next-jest-esm-transform.md) |
| Container builds but won't boot / `/api/health` fails | runtime / env | `just site-up` logs; [CI pipeline](../concepts/ci-pipeline.md) |
| `/api/metrics` hangs or 500s | metrics / SSM | [prom-client singleton registry](./prom-client-singleton-registry.md) |
| Articles list empty, resume 204, chat 502/504 | BFF unreachable | [cluster-access runbook](./local-dev-and-cluster-access.md); [BFF consumer](../concepts/in-cluster-bff-consumer.md) |
| Chat returns generic / ungrounded answers | RAG grounding (backend) | [chatbot architecture](../concepts/chatbot-architecture.md) (owner-id + corpus) |
| `just site-rds` can't connect / port-forward dies | SSO / kube context / network | [cluster-access runbook](./local-dev-and-cluster-access.md) |
| Deploy green but site still old image | ArgoCD hand-off | [deploy pipeline runbook](../runbooks/frontend-deploy-pipeline.md) |

## Diagnostic command reference

```bash
# Local — reproduce the CI gate and the container
just ci                       # full gate: audit, lint, typecheck, test, build
just site-up                  # build + run the prod image, wait for /api/health
docker logs -f nextjs-site-local   # follow container logs
curl -s localhost:3000/api/health                       # liveness
curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/metrics   # expect 401 without token

# Real data — BFF over a port-forward (needs dev-account SSO + kube context)
just site-rds                 # port-forward public-api + next dev against real RDS
curl -s localhost:3001/api/articles | head             # is the BFF returning data?
```

See the [cluster-access & networking runbook](./local-dev-and-cluster-access.md)
for the full `kubectl`/`aws` command set.

## Troubleshooting docs

- [Local dev & cluster access (networking)](./local-dev-and-cluster-access.md) —
  SSO, kube context, the `just site-rds` port-forward, and its failure modes
- [MDX test suites fail with "Unexpected token 'export'"](./next-jest-esm-transform.md) —
  the flaky, hoisting-dependent next/jest ESM-transform failure and the fix
- [prom-client metrics break under Next.js bundling](./prom-client-singleton-registry.md) —
  duplicate registry / Edge-runtime warnings and the fix

For dependency/security-advisory handling (Dependabot, transitive-vuln triage),
see [dependency security](../concepts/dependency-security.md).

Historical (removed mechanisms) live in [docs/history/](../history/).

## Related

- [CI pipeline & branch strategy](../concepts/ci-pipeline.md)
- [CD pipeline](../concepts/cd-pipeline.md) and [deploy runbook](../runbooks/frontend-deploy-pipeline.md)
- [In-cluster BFF consumer architecture](../concepts/in-cluster-bff-consumer.md)

<!--
Evidence trail:
- justfile recipes (read 2026-07-04): ci/audit/lint/typecheck/test/build, site-up/fast/logs/down, site-rds, docker-test-site, build-site, start-site
- No *.sh/*.bash files in repo; automation = justfile + tsx scripts (local-dev.ts, sync-static-to-s3.ts, seed-resumes.ts)
- test:api npm script references apps/site/scripts/test-api.ts which does not exist (broken script — flagged)
-->
