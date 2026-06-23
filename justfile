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

# Run ESLint across the workspace
lint:
	yarn lint

# Run TypeScript compiler checks
typecheck:
	yarn workspace site exec tsc --noEmit

# Run unit tests
test:
	yarn test --ci --coverage --runInBand --watchman=false

# Run production builds
build:
	yarn build

# ==========================================
# Local Site Image
#
# Requirements:
#   - Docker Desktop or colima running
# ==========================================

# Stop → build → start the site image.
site-up profile="dev-account" *flags="":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts {{flags}}

# Stop → start using cached images (skips docker build, faster restarts).
site-fast profile="dev-account":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts --no-rebuild

# Stop → build → start → tail logs (Ctrl+C detaches, container stays up).
site-logs profile="dev-account":
	AWS_PROFILE={{profile}} npx tsx scripts/local-dev.ts --logs

# Stop and remove the site container.
site-down:
	npx tsx scripts/local-dev.ts --stop

# ==========================================
# Docker Smoke Tests
# ==========================================

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
