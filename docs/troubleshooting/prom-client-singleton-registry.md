---
title: prom-client metrics break under Next.js bundling
type: troubleshooting
tags: [prometheus, prom-client, nextjs, observability, edge-runtime]
sources:
  - apps/site/next.config.mjs
  - apps/site/src/app/api/metrics/route.ts
  - apps/site/src/lib/observability/metrics.ts
created: 2026-06-23
updated: 2026-06-23
---

## Symptom

Two related failures when `prom-client` is left to Next.js's default bundling:

- Build-time warnings for every import that transitively reaches `prom-client`,
  because it uses Node-only APIs (`process.version`, `process.hrtime`, `Buffer`)
  that the Edge runtime does not provide
  ([metrics/route.ts:191-194](../../apps/site/src/app/api/metrics/route.ts#L191-L194)).
- Metrics that register cleanly in one module but appear missing or
  double-registered at runtime, because more than one copy of the `prom-client`
  module — and therefore more than one `Registry` — exists in the bundle.

## Root cause

`prom-client` keeps metrics in a module-level `Registry`
([metrics.ts:7](../../apps/site/src/lib/observability/metrics.ts#L7)). When the
bundler includes `prom-client` in multiple chunks / module-graph instances, each
gets its own `Registry`, so the registry the `/api/metrics` route serves is not
the one the rest of the app wrote to. Running the route on the Edge runtime
fails outright because the Node APIs are absent.

## How to diagnose

- Check the build log for `prom-client` Edge-runtime warnings.
- Hit `/api/metrics` and confirm your custom `nextjs_*` series are present, not
  just defaults.
- Confirm the route is on the Node runtime (not Edge).

## How to fix

Two settings, both already applied in this repo:

1. Externalise the Node-only packages so a single instance is used, in
   `next.config.mjs`
   ([next.config.mjs:43-49](../../apps/site/next.config.mjs#L43-L49)):
   ```js
   serverExternalPackages: [
     '@opentelemetry/instrumentation',
     '@opentelemetry/auto-instrumentations-node',
     '@opentelemetry/exporter-trace-otlp-grpc',
     '@grpc/grpc-js',
     'prom-client',
   ],
   ```
2. Pin the metrics route to the Node runtime
   ([metrics/route.ts:195](../../apps/site/src/app/api/metrics/route.ts#L195)):
   ```ts
   export const runtime = 'nodejs';
   ```

These landed in commits `a823bbb` (singleton Registry via
`serverExternalPackages`) and `718cf57` (silence Edge-runtime warnings).

## How to prevent

Keep any Node-only telemetry dependency in `serverExternalPackages`, and keep
metric definitions in a single module imported everywhere
([metrics.ts](../../apps/site/src/lib/observability/metrics.ts)) rather than
re-instantiating `Registry`.

<!--
Evidence trail (auto-generated):
- Source: apps/site/next.config.mjs (read on 2026-06-23)
- Source: apps/site/src/app/api/metrics/route.ts (read on 2026-06-23)
- Source: apps/site/src/lib/observability/metrics.ts (read on 2026-06-23)
- Incident: commits a823bbb, 718cf57
-->
