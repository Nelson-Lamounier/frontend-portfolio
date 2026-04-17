# By default, list all available commands
default:
	@just --list

# ==========================================
# Comprehensive CI Validation
# ==========================================

# Run all standard CI checks locally
ci: audit lint typecheck test build
	@echo "All CI checks completed successfully!"

# Run security audit on dependencies
audit:
	yarn npm audit --all --severity high

# Run ESLint across workspace and start-admin
lint:
	yarn lint
	yarn workspace start-admin lint

# Run TypeScript compiler checks
typecheck:
	yarn workspace site exec tsc --noEmit
	yarn workspace start-admin typecheck

# Run unit tests
test:
	yarn test --ci --coverage
	yarn workspace start-admin test

# Run production builds
build:
	yarn build
	yarn workspace start-admin build

# ==========================================
# Local Frontend Images — start-admin + site
#
# Builds and runs the two frontend Docker images locally.
# start-admin connects to the already-running admin-api container
# via a shared Docker bridge network, replicating K8s pod-to-pod DNS.
#
# Network wiring (matches production):
#   K8s:   start-admin → http://admin-api.admin-api:3002
#   Local: start-admin → http://admin-api:3002  (Docker DNS alias)
#
# Requirements:
#   - Docker Desktop or colima running
#   - admin-api already running locally (`just admin-api-up` in cdk-monitoring)
#   - apps/start-admin/.env.local with Cognito vars
# ==========================================

# Stop → build → start both frontend images (start-admin + site).
cluster-up profile="dev-account" *flags="":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts {{flags}}

# Stop → start using cached images (skips docker build, faster restarts).
cluster-fast profile="dev-account":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts --no-rebuild

# Stop → build → start → tail combined logs (Ctrl+C detaches, containers stay up).
cluster-logs profile="dev-account":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts --logs

# Build and start only the start-admin image (skip site).
cluster-admin profile="dev-account":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts --admin-only

# Build and start only the site image (skip start-admin).
cluster-site:
	npx tsx scripts/local-dev.ts --site-only

# Stop and remove both frontend containers.
cluster-down:
	npx tsx scripts/local-dev.ts --stop

# Forward K8s admin-api service to localhost:3002 (use when admin-api runs on remote cluster).
# Alternative to `just admin-api-up` in cdk-monitoring for K8s-backed admin-api.
admin-api-forward namespace="admin-api":
	kubectl port-forward svc/admin-api 3002:3002 -n {{namespace}}

# ==========================================
# Docker Smoke Tests
# ==========================================

# Build and run the TanStack Start Admin container locally (exactly like CI smoke testing)
docker-test-admin:
	docker build -t start-admin:ci-test -f apps/start-admin/Dockerfile .
	docker run --rm -it -p 5001:5001 start-admin:ci-test

# Build and run the Next.js Site container locally (exactly like CI smoke testing)
docker-test-site:
	docker build -t site:ci-test -f Dockerfile .
	docker run --rm -it -p 3000:3000 site:ci-test

# ==========================================
# Site Specific Commands
# ==========================================

# Build the Next.js Site application
build-site:
	yarn workspace site build

# Start the built Next.js Site production server
start-site:
	yarn workspace site start

