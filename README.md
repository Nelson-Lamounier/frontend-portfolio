# Personal Portfolio & Cloud Architecture Showcase

> This repository is public for portfolio review, recruiter review, and engineering discussion. It is not an open-source template or starter kit.

This is the frontend for Nelson Lamounier's personal portfolio and technical writing site. The production app is built with **Next.js 15**, **React 19**, **Tailwind CSS v4**, AWS service integrations, Prometheus metrics, and Grafana/OpenTelemetry observability.

## What This Repo Contains

- `apps/site` - the deployable Next.js App Router application.
- `apps/site/src/app` - routes, layouts, API handlers, and server components.
- `apps/site/src/components` - reusable UI and experience components.
- `apps/site/src/lib` - AWS clients, content services, observability, validation, and shared app utilities.
- `.github/workflows/ci.yml` - lint, typecheck, test, build, audit, and Docker smoke checks.
- `.github/workflows/deploy-frontend.yml` - development deployment pipeline for the site image and static assets.
- `Dockerfile` - production container build for `apps/site`.

## Tech Stack

- **Framework:** Next.js App Router, React 19, TypeScript.
- **Styling:** Tailwind CSS v4, Framer Motion, Headless UI.
- **Content:** MDX, `next-mdx-remote`, `remark-gfm`, `rehype-prism-plus`.
- **AWS:** DynamoDB, S3, SSM Parameter Store, CloudFront, ECR, ECS/Kubernetes deployment integration.
- **Observability:** Grafana Faro, OpenTelemetry, `prom-client`, Prometheus-compatible `/api/metrics`.
- **Testing:** Jest, React Testing Library, SonarCloud coverage import.

## Quickstart

```bash
yarn install
yarn workspace site dev
```

The development server runs on [http://localhost:3000](http://localhost:3000).

## Quality Gates

Run the same checks used for repository readiness:

```bash
yarn npm audit --all --severity high
yarn lint
yarn workspace site exec tsc --noEmit
yarn test --ci --coverage --runInBand --watchman=false
yarn build
```

If `just` is installed, the same bundle is available with:

```bash
just ci
```

## Configuration

Local development works without production AWS secrets. Production-only values are loaded from environment variables or AWS SSM Parameter Store.

Important environment variables:

- `AWS_REGION` - AWS region for SDK clients, defaulting to `eu-west-1` where supported.
- `METRICS_TOKEN_SSM_PATH` - SSM SecureString path for the `/api/metrics` bearer token in production.
- `METRICS_BEARER_TOKEN` - direct bearer token override for CI, smoke tests, or private runtimes that do not use SSM.
- `NEXT_PUBLIC_*` variables - browser-safe configuration only.

Do not commit `.env` files. Use `.env.example` for safe placeholders if a new variable needs to be documented.

## Security Notes

- `/api/metrics` is open only for local/test environments when no SSM token path is configured.
- In production, `/api/metrics` fails closed if the bearer token cannot be loaded from SSM.
- The repository is licensed for source review only. See [LICENSE.md](LICENSE.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Generated output, dependency caches, local secrets, and build artifacts are ignored by Git.

## Deployment

The site is containerized by the root `Dockerfile`. The development deployment workflow builds the image, extracts static Next.js assets for S3/CloudFront, publishes the image to ECR, writes the promoted image URI to SSM, and smoke-tests the live Kubernetes rollout.

## Ownership

Designed, implemented, and operated by Nelson Lamounier.
