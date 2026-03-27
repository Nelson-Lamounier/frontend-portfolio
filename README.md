# Personal Portfolio & Cloud Architecture Showcase

> **Note to Recruiters & Engineering Teams**: This repository is public exclusively for showcase and code-review purposes. It is NOT an open-source template. It is an actively maintained, live production application currently serving real consumer traffic.

Welcome to the frontend architecture for my personal portfolio and technical blog. Built with **Next.js 15**, **React 19**, and **Tailwind CSS v4**, this application serves as the user-facing edge of a highly-observable, enterprise-grade cloud environment.

It is fully integrated with AWS Serverless data layers, Generative AI capabilities, and a self-hosted Kubernetes deployment pipeline.

---

## ⚡ Key Architectural Features

- **Blazing Fast Frontend**: Server-Side Rendered (SSR) & Statically Generated (SSG) pages using the Next.js App Router for optimal SEO and sub-second load times.
- **Dynamic MDX Blog Engine**: Articles written in MDX are securely fetched from an AWS S3 data lake, while metadata and engagement metrics (likes, views) are synchronised in real-time with Amazon DynamoDB.
- **Generative AI Chatbot**: Deeply integrated with Amazon Bedrock Agents to allow visitors to chat directly with my personalised AI replica context-aware of my resume and articles.
- **Enterprise Authentication (Zero-Trust)**: The administrative dashboard is secured natively with AWS Cognito (OAuth 2.0 / PKCE) and NextAuth v5, bypassing risky secret-sharing in the cluster.
- **Complete In-Browser Observability**: Client-side Real User Monitoring (RUM) handled by Grafana Faro SDK, seamlessly sending browser telemetry back to an Alloy collector to monitor global user behaviour.
- **Rich User Experience**: Smooth layout transitions, dark mode architectures, and micro-interactions powered by Framer Motion.

---

## 🛠 Technology Stack

### Frontend Application
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Content**: `next-mdx-remote`, `remark-gfm`, `rehype-prism-plus` (Syntax highlighting)
- **Data Validation**: [Zod](https://zod.dev/)

### Data & Cloud Integration (AWS)
- **Database**: Amazon DynamoDB (Single-table architecture for articles, views, limits)
- **Storage**: Amazon S3 (Raw MDX content storage)
- **Identity & Access Management (IAM)**: Amazon Cognito
- **Artificial Intelligence**: Amazon Bedrock Agents API
- **SDK**: `@aws-sdk/client-dynamodb`, `@aws-sdk/client-s3`

### Client-Side Observability (LGTM Stack)
- **Real User Monitoring (RUM)**: Grafana Faro Web SDK (`@grafana/faro-web-sdk`)
- **Distributed Tracing**: OpenTelemetry (`@opentelemetry/sdk-node`, AWS X-Ray integration)
- **Application Metrics**: Prometheus Client (`prom-client`)

---

## 🏗 Continuous Integration & Infrastructure

This frontend is deeply integrated into a modern GitOps deployment lifecycle designed to handle production-grade traffic patterns and is heavily optimised for developer velocity.

1. **Continuous Integration (GitHub Actions)**:
   - **Quality**: Strict ESLint, Prettier, and TypeScript compiler checks (`tsc --noEmit`) blocking PR merges.
   - **Testing**: Complete Jest unit testing suite enforcing high code coverage.
   - **Security (SAST)**: Automated code and dependency scanning via **SonarCloud** blocking vulnerable dependencies.
   - **Smoke Tests**: Isolated Docker build-tests ensuring critical Next.js API boundaries (`/api/health` and `/api/metrics`) are functional before reaching the deployment phase.
   
2. **Continuous Deployment (GitOps)**:
   - The verified application is containerised into a highly secure, multi-stage distroless Docker image.
   - Images are monitored by ArgoCD and deployed to a self-managed, highly-available Kubernetes (K3s) cluster running on AWS EC2.
   - Global traffic routing is handled by AWS CloudFront (CDN) with origin traffic entering through a Traefik Ingress controller directly to the Next.js Pods.

---

## 🧪 Testing Culture

This codebase is upheld by rigorous automated testing protocols designed to prevent regressions in a live consumer application:

- **Unit Testing**: Jest & React Testing Library are used to mock AWS SDKs and assert component behaviour in simulated DOMs.
- **Continuous Coverage**: SonarCloud ingests Jest coverage reports (`lcov.info`) strictly enforcing coverage thresholds on all new pull requests.

---

> *Designed, architected, and operated by Nelson Lamounier.*
