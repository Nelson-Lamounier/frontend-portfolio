# Dockerfile for Next.js Standalone Application
# Optimized multi-stage build for production deployment

FROM node:22-alpine AS base
RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable

# Dependencies stage - install only production dependencies
FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --frozen-lockfile

# Builder stage - build the Next.js application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

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

# Runner stage - production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "server.js"]