# Dockerfile for Next.js Standalone Application
# Multi-stage build using Amazon Linux 2023 for K8s parity
#
# The runner stage uses amazonlinux:2023 to match the
# Kubernetes worker node OS, ensuring identical runtime
# behavior between local Docker and production pods.

# ── Stage 1: Dependencies (Node.js on Amazon Linux 2023) ──────────
FROM amazonlinux:2023 AS base

# Install Node.js 22 LTS and shadow-utils (groupadd/useradd) via dnf
RUN dnf install -y nodejs22 nodejs22-npm shadow-utils && \
  dnf clean all && \
  npm install -g corepack && \
  corepack enable

# ── Stage 2: Install dependencies ─────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --frozen-lockfile

# ── Stage 3: Build the Next.js application ────────────────────────
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inject API URL at build time (Next.js inlines NEXT_PUBLIC_* during build)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Set build-time environment variables
ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED

# Skip linting and type checking during Docker build
# These checks are performed in CI pipeline
ENV ESLINT_NO_DEV_ERRORS=true

# Use file-based articles during build (API not accessible during Docker build)
# Runtime will use API when NEXT_PUBLIC_API_URL is configured
ENV USE_FILE_FALLBACK=true

# Build Next.js application (skip lint/typecheck - validated in CI)
RUN yarn build --no-lint

# ── Stage 4: Production runner (Amazon Linux 2023) ────────────────
FROM amazonlinux:2023 AS runner
WORKDIR /app

# Install Node.js runtime and shadow-utils (groupadd/useradd)
RUN dnf install -y nodejs22 shadow-utils && \
  dnf clean all

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
  useradd --system --uid 1001 --gid nodejs nextjs

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# OpenTelemetry configuration (disabled by default, enabled in K8s via pod spec)
ENV OTEL_SDK_DISABLED=true
ENV OTEL_SERVICE_NAME=nextjs-portfolio
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "server.js"]