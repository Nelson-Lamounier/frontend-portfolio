# Personal Portfolio & Cloud Lab

A modern, highly-observable personal portfolio and technical blog built with **Next.js 15**, **React 19**, and **Tailwind CSS v4**. 

Beyond a standard portfolio, this repository serves as the frontend for a robust, enterprise-grade cloud laboratory. It is fully integrated with AWS Serverless architectures, generative AI, and a self-hosted Kubernetes observability stack.

---

## ⚡ Key Features

- **Blazing Fast Frontend**: Server-Side Rendered (SSR) & Statically Generated (SSG) pages using Next.js 15 App Router.
- **Dynamic MDX Blog**: Articles written in MDX are fetched from AWS S3, while metadata and engagement metrics (likes, views) are synchronised in real-time with Amazon DynamoDB.
- **Generative AI Chatbot**: Integrated with Amazon Bedrock Agents to allow visitors to chat directly with my personalised AI replica.
- **Enterprise Authentication**: Admin dashboard secured with AWS Cognito (OAuth 2.0 / PKCE) and NextAuth v5.
- **Complete In-Browser Observability**: Client-side Real User Monitoring (RUM) handled by Grafana Faro SDK, seamlessly sending telemetry back to an Alloy collector to monitor behaviour.
- **Rich Animations**: Smooth layout transitions and micro-interactions powered by Framer Motion.

---

## 🛠 Technology Stack

### Frontend Architecture
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components, Edge UI)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Content**: `next-mdx-remote`, `remark-gfm`, `rehype-prism-plus` (Syntax highlighting)
- **Validation**: [Zod](https://zod.dev/)

### Data & Cloud (AWS)
- **Database**: Amazon DynamoDB (Single-table design for articles, views, limits)
- **Storage**: Amazon S3 (Raw MDX content storage)
- **Auth**: Amazon Cognito & `next-auth@beta`
- **GenAI**: Amazon Bedrock Agents API
- **SDK**: `@aws-sdk/client-dynamodb`, `@aws-sdk/client-s3`

### Observability (LGTM Stack)
- **Real User Monitoring**: Grafana Faro Web SDK (`@grafana/faro-web-sdk`)
- **Tracing**: OpenTelemetry (`@opentelemetry/sdk-node`, AWS X-Ray integration)
- **Metrics**: Prometheus Client (`prom-client`)

---

## 🏗 Infrastructure & CI/CD Pipeline

This application doesn't just run locally; it is built to handle production-grade traffic patterns and is heavily optimised.

1. **Continuous Integration (GitHub Actions)**:
   - **Quality**: ESLint, Prettier, and TypeScript compiler checks (`tsc --noEmit`).
   - **Testing**: Complete Jest unit testing suite with coverage reports.
   - **Security (SAST)**: Automated code and dependency scanning via **SonarCloud**.
   - **Smoke Tests**: Isolated Docker build tests ensuring `/api/health` and `/api/metrics` are functional before merging.
2. **Continuous Deployment (GitOps)**:
   - Containerised into a multi-stage distroless Docker image.
   - Deployed to a self-managed, highly-available Kubernetes (K3s) cluster running on AWS EC2.
   - Traffic routing handled by CloudFront (CDN) → Traefik (Ingress) → Next.js Pods.

---

## 💻 Local Development Setup

To run this project locally, you will need Node.js `22` (or the version specified in `.nvmrc`) and `yarn`.

### 1. Install Dependencies
```bash
yarn install --immutable
```

### 2. Environment Variables
Create a `.env.local` file in the root directory. You will need authorised AWS IAM credentials and the correct SSM parameters to bridge local development to the AWS cloud resources.
```env
# AWS Context
AWS_REGION=eu-west-1
AWS_PROFILE=dev-account

# AWS DynamoDB & S3
DYNAMODB_TABLE_NAME=bedrock-dev-ai-content
ASSETS_BUCKET_NAME=bedrock-dev-kb-data

# Auth Flags
NEXT_PUBLIC_FARO_ENABLED=false
```

### 3. Start the Development Server
```bash
yarn dev
```
Navigate to `http://localhost:3000` to view the application.

---

## 🧪 Testing

The repository maintains a strict testing culture:

```bash
# Run unit tests
yarn test

# Run tests with live watch mode
yarn test:watch

# Generate coverage reports (Ready for SonarQube ingestion)
yarn test --coverage
```

---

> *Built with ❤️ by Nelson Lamounier*
