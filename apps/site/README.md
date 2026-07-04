# `site` — portfolio Next.js application

The deployable Next.js 15 / React 19 application for the portfolio. This is the
single workspace package (`name: "site"`) in the monorepo; the repository root
holds shared tooling, the `Dockerfile`, CI/CD, and cross-cutting docs.

> **New here?** Start with the [root README](../../README.md) for the system
> architecture (consumer-only BFF, observability, blue-green deploys) and the
> [`docs/`](../../docs/README.md) index for concepts, runbooks, and
> troubleshooting.

## What lives here

The app is a pure **consumer**: every route handler runs server-side and reads
dynamic data from the in-cluster `public-api` BFF over Kubernetes DNS. It holds
no AWS data credentials at runtime — see
[in-cluster BFF consumer architecture](../../docs/concepts/in-cluster-bff-consumer.md).

```text
src/
  app/
    (site)/          public routes, layouts, MDX article pages, server components
    api/             route handlers — /api/chat, /api/resume, /api/metrics, engagement
    sitemap.ts       dynamic sitemap.xml (static routes + article slugs)
    robots.ts        robots.txt
    layout.tsx       root layout + metadataBase + providers
  components/         UI and experience components (incl. the chat widget)
  lib/
    articles/        BFF consumer layer for articles + engagement (likes/comments)
    chat/            Bedrock RAG chat proxy client
    resumes/         active-resume consumer
    observability/   OpenTelemetry, prom-client metrics, Faro RUM wiring
    rate-limiter.ts  per-route rate limiting
    site-config.ts   canonical SITE_URL (metadataBase / sitemap / robots)
  instrumentation.ts Next.js instrumentation hook (server-side OTel bootstrap)
  middleware.ts      security headers / edge middleware
  styles/            Tailwind v4 styles
  types/             shared TypeScript types
scripts/
  seed-resumes.ts    local/dev seeding utility
__tests__/           Jest + React Testing Library suites (see __tests__/README.md)
```

## Running

All commands run from the repository root via the Yarn workspace:

```bash
yarn install
yarn workspace site dev      # dev server on http://localhost:3000
```

Local development works without production AWS secrets. Point at a reachable BFF
by setting `PUBLIC_API_URL`; when the BFF is unreachable the read paths degrade
gracefully (empty lists / hardcoded resume) so the app still builds and renders.
See [`.env.example`](../../.env.example) for the full variable list.

### Scripts

| Command | Purpose |
| --- | --- |
| `yarn workspace site dev` | Next dev server (port 3000) |
| `yarn workspace site build` | Production build (standalone output) |
| `yarn workspace site lint` | ESLint, zero-warning gate |
| `yarn workspace site test` | Jest + React Testing Library |

Type-checking is run at the root with `yarn workspace site exec tsc --noEmit`.

## Related docs

- [Frontend development](../../docs/concepts/frontend-development.md)
- [Bedrock RAG chat proxy](../../docs/concepts/bedrock-rag-proxy.md)
- [Observability architecture](../../docs/concepts/observability-architecture.md)
- [`/api/metrics` endpoint](../../docs/tools/metrics-endpoint.md)
