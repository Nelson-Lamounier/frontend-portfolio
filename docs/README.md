# Documentation

Technical documentation for the portfolio site, grouped by type. Each file is a
single self-contained topic, optimised for retrieval.

## Concepts

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
- [Blue-green rollout promotion via SSM](./concepts/blue-green-rollout-via-ssm.md)
  — driving Argo Rollouts promotion remotely over SSM Run Command

## Runbooks

- [Frontend deploy pipeline](./runbooks/frontend-deploy-pipeline.md)
  — the Argo Rollouts blue-green deploy stages and how to operate them
- [Apply an RDS migration via an SSM tunnel](./runbooks/rds-migration-via-ssm-tunnel.md)
  — applying a numbered migration to private RDS through a port-forward

## Tools

- [/api/metrics endpoint](./tools/metrics-endpoint.md)
  — Prometheus endpoint with SSM bearer-token auth, fail-closed in production

## Troubleshooting

- [prom-client metrics break under Next.js bundling](./troubleshooting/prom-client-singleton-registry.md)
  — duplicate registry / Edge-runtime warnings and the fix
- [Rollout promotion exits early on a stale-Healthy rollout](./troubleshooting/rollout-stale-healthy-early-exit.md)
  — the ArgoCD-sync race in the promote step and its guard

<!--
Evidence trail (auto-generated):
- Index of docs/ generated 2026-06-23; links verified against files in this tree
-->
