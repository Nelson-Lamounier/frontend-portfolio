# Dockerfile for TanStack Start Admin Dashboard
# Multi-stage build using Amazon Linux 2023 for K8s parity
#
# TanStack Start uses Vinxi (Nitro-based) server output.
# Build output lands in .output/ with a portable Node.js server.

# ── Stage 1: Base (Node.js on Amazon Linux 2023) ──────────────────
FROM amazonlinux:2023 AS base

# Install Node.js 22 LTS and shadow-utils (groupadd/useradd) via dnf
RUN dnf install -y nodejs22 nodejs22-npm shadow-utils && \
  dnf clean all && \
  npm install -g corepack && \
  corepack enable

# ── Stage 2: Install dependencies ─────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy root workspace configs for monorepo resolution
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/start-admin/package.json ./apps/start-admin/
COPY packages/shared/package.json ./packages/shared/

RUN yarn install --frozen-lockfile

# ── Stage 3: Build the TanStack Start application ─────────────────
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/start-admin/node_modules ./apps/start-admin/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Build the TanStack Start application via Vinxi
RUN yarn workspace start-admin build

# ── Stage 4: Production runner (Amazon Linux 2023) ────────────────
FROM amazonlinux:2023 AS runner
WORKDIR /app

# Install Node.js runtime and shadow-utils
RUN dnf install -y nodejs22 shadow-utils && \
  dnf clean all

ENV NODE_ENV=production

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
  useradd --system --uid 1001 --gid nodejs startadmin

# Copy the Vinxi/Nitro build output
COPY --from=builder --chown=startadmin:nodejs /app/apps/start-admin/.output ./

# Switch to non-root user
USER startadmin

# Expose port
EXPOSE 3001
ENV PORT=3001
ENV HOST="0.0.0.0"

# Health check — Vinxi/Nitro serves from the configured port
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3001; require('http').get('http://localhost:' + port + '/admin/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)})" || exit 1

# Start the Vinxi/Nitro server
CMD ["node", "server/index.mjs"]
