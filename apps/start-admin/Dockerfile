# Dockerfile for TanStack Start Admin Dashboard
# Multi-stage build using Amazon Linux 2023 for K8s parity
#
# TanStack Start uses Vite SSR build.
# Build output lands in dist/ with client + server bundles.

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
COPY apps/site/package.json ./apps/site/package.json
COPY apps/start-admin/package.json ./apps/start-admin/package.json
COPY apps/start-site/package.json ./apps/start-site/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN yarn install --immutable

# ── Stage 3: Build the TanStack Start application ─────────────────
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/start-admin/node_module[s] ./apps/start-admin/node_modules/
COPY --from=deps /app/packages/shared/node_module[s] ./packages/shared/node_modules/

# Copy source code
COPY . .

# Set build-time environment variables
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Build the TanStack Start application via Vite
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

# Copy the Vite SSR build output (client + server bundles)
COPY --from=builder --chown=startadmin:nodejs /app/apps/start-admin/dist ./dist

# Copy root node_modules to the standard resolution path (/app/node_modules).
# NODE_PATH does NOT work with ESM imports — Node.js ESM resolver only walks
# the directory hierarchy for node_modules folders. Placing them here means
# `import "h3-v2"` from /app/dist/server/server.js resolves via /app/node_modules/h3-v2.
COPY --from=builder --chown=startadmin:nodejs /app/node_modules ./node_modules

# Overlay workspace-hoisted packages (eslint etc. not needed at runtime, but
# any start-admin-specific deps that were hoisted into the workspace folder
# need to be merged in).
COPY --from=builder --chown=startadmin:nodejs /app/apps/start-admin/node_module[s] ./node_modules/

# Ensure ESM resolution works — server.js uses `import` syntax, so Node.js
# needs a package.json with "type": "module" in the resolution chain.
RUN echo '{"type":"module"}' > /app/package.json && chown startadmin:nodejs /app/package.json

# Switch to non-root user
USER startadmin

# Expose port — matches K8s pod configuration
EXPOSE 5001
ENV PORT=5001
ENV HOST="0.0.0.0"

# Health check — TanStack Start SSR server (use import() for ESM compatibility)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "import('http').then(h => h.default.get('http://localhost:' + (process.env.PORT || 5001) + '/admin/', r => process.exit(r.statusCode < 500 ? 0 : 1)))" || exit 1

# Start the TanStack Start SSR server
CMD ["node", "dist/server/server.js"]
