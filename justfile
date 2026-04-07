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

