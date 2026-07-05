# Documentation

Technical documentation for the portfolio site, grouped by type. Each file is a
single self-contained topic, optimised for retrieval.

## Concepts

- [Frontend development — TypeScript, React 19 & Next.js 15](./concepts/frontend-development.md)
  — language/framework choices and why, hooks & UI patterns, SEO, testing, the full frontend stack
- [CI pipeline & branch strategy](./concepts/ci-pipeline.md)
  — what CI does and why; trunk-based branch/PR/trigger model (GitHub leads)
- [The "Lami" chatbot — RAG architecture, workflow & guardrails](./concepts/chatbot-architecture.md)
  — the portfolio's differentiator: full RAG pipeline, model stack, owner scoping, guardrails
- [Dependency security — Dependabot & transitive-vuln triage](./concepts/dependency-security.md)
  — the two audit sources, grouped CI-verified auto-updates, and the verified manual bump recipe
- [CD pipeline — GitHub Actions to ECR, then ArgoCD](./concepts/cd-pipeline.md)
  — GitHub builds & pushes to ECR/SSM; ArgoCD + Argo Rollouts auto-promote downstream
- [Request routing — DNS to EKS pod](./concepts/request-routing-dns-to-pod.md)
  — how a visitor reaches the pod: Route 53 → shared ALB → IP-target → pod (no CloudFront)
- [API & data communication](./concepts/api-and-data-communication.md)
  — REST/JSON protocol, article queries + response shapes, CRUD, cookies (none), CORS (none)
- [In-cluster BFF consumer architecture](./concepts/in-cluster-bff-consumer.md)
  — the site as a pure consumer of the `public-api` BFF (RDS) over Kubernetes DNS
- [Bedrock RAG chat proxy](./concepts/bedrock-rag-proxy.md)
  — how `/api/chat` proxies the session-aware RAG endpoint; key ownership, error mapping
- [Chatbot data security](./concepts/chatbot-data-security.md)
  — RAG-not-SQL access model, RDS private posture, hardening recommendations
- [Observability architecture](./concepts/observability-architecture.md)
  — OpenTelemetry + Prometheus + Grafana Faro across browser and server
- [OpenTelemetry observability strategy](./concepts/opentelemetry-strategy.md)
  — deeper rationale (OTel vs aws-xray-sdk, before/after visibility)
- [Projects page as a Tucaken case-study consumer](./concepts/projects-case-study-consumer.md)
  — repo sync → case-study pipeline → owner-pinned BFF → grid + native detail page

## Patterns

- [Graceful-degradation consumer (consume-don't-crash)](./patterns/graceful-degradation-consumer.md)
  — every BFF read returns []/null on failure so builds, ISR, and outages degrade instead of crash

## Decisions

- [0002 — Pin public project routes to the owner's user id](./decisions/0002-owner-id-isolation.md)
  — why a GitHub username is not an isolation key, and the fail-closed owner pinning chosen instead

## Runbooks

- [Frontend deploy pipeline](./runbooks/frontend-deploy-pipeline.md)
  — the GitHub-led build → ECR → SSM → ArgoCD blue-green flow and how to operate it
- [Apply an RDS migration via an SSM tunnel](./runbooks/rds-migration-via-ssm-tunnel.md)
  — applying a numbered migration to private RDS through a port-forward

## Tools

- [/api/metrics endpoint](./tools/metrics-endpoint.md)
  — Prometheus endpoint with SSM bearer-token auth, fail-closed in production

## Troubleshooting

- [Troubleshooting guide & automation](./troubleshooting/README.md)
  — how to troubleshoot the app, the `justfile` automation inventory, and a symptom → fix map
- [Local dev & cluster access (networking)](./troubleshooting/local-dev-and-cluster-access.md)
  — SSO, kube context, the `just site-rds` BFF port-forward, and its failure modes
- [MDX test suites fail with "Unexpected token 'export'" (next/jest + ESM)](./troubleshooting/next-jest-esm-transform.md)
  — the flaky, hoisting-dependent Jest ESM-transform failure and the deterministic fix
- [prom-client metrics break under Next.js bundling](./troubleshooting/prom-client-singleton-registry.md)
  — duplicate registry / Edge-runtime warnings and the fix

## History

Archived records of removed/superseded designs, kept for provenance.

- [BFF migration gap analysis](./history/bff-migration-gap-analysis.md)
  — pre-migration decision record for the admin/producer stack
- [Blue-green rollout promotion via SSM](./history/blue-green-rollout-via-ssm.md)
  — the removed GitHub-driven `promote` over SSM Run Command (now ArgoCD auto-promote)
- [Rollout stale-Healthy early exit](./history/rollout-stale-healthy-early-exit.md)
  — troubleshooting for the removed promote step's spec-sync race
- [Admin state management](./history/admin-state-management/README.md)
  — Zustand + TanStack Query architecture of the separate admin app (scaffolding removed from this repo)

<!--
Evidence trail (auto-generated):
- Index of docs/ generated 2026-06-23; links verified against files in this tree
-->

## Reports

- [GitHub account review & DORA report](./reports/github-dora-review.md)
  — commit/PR/branch percentage metrics, the four DORA metrics, and the gaps closed
- ["Frontend & RUM" dashboard — panel review & gaps](./reports/frontend-rum-dashboard-review.md)
  — live per-panel review of the RUM dashboard (web vitals, errors, audience, pipeline health) and the observability gaps found (applied in kubernetes-bootstrap #184)
