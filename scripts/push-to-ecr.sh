#!/bin/bash
# push-to-ecr.sh
# Script to build and push Next.js Docker image to Amazon ECR
#
# Auth modes:
#   - CI/Pipeline: Uses OIDC (credentials from env vars, no --profile needed)
#   - Local/Manual: Uses AWS CLI profile (--profile flag)
#
# CI mode flags:
#   --skip-build   Skip Docker build (image already built by pipeline)
#   --ecr-url      Provide ECR URL directly (skip SSM/account lookup)
#   --image-name   Name of the pre-built local Docker image to tag and push
#
# Usage:
#   Local:    ./scripts/push-to-ecr.sh --env dev --profile dev-account
#   Pipeline: ./scripts/push-to-ecr.sh --env development --ecr-url <url> --skip-build --image-name frontend:latest

set -euo pipefail

# Default configuration
DEFAULT_REPO_NAME="nextjs-frontend"
DEFAULT_REGION="eu-west-1"
DEFAULT_PROFILE="dev-account"
DEFAULT_TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
REPO_NAME="${REPO_NAME:-$DEFAULT_REPO_NAME}"
AWS_REGION="${AWS_REGION:-$DEFAULT_REGION}"
AWS_PROFILE="${AWS_PROFILE:-}"
IMAGE_TAG="${IMAGE_TAG:-$DEFAULT_TAG}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
SKIP_BUILD=false
ECR_URL=""
IMAGE_NAME=""
SKIP_SYNC=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --repo)
      REPO_NAME="$2"
      shift 2
      ;;
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-sync)
      SKIP_SYNC=true
      shift
      ;;
    --ecr-url)
      ECR_URL="$2"
      shift 2
      ;;
    --image-name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Build and push Docker image to ECR, then sync static assets to S3"
      echo ""
      echo "Options:"
      echo "  --tag          Docker image tag (default: latest)"
      echo "  --profile      AWS CLI profile (default: auto-detect)"
      echo "  --region       AWS region (default: eu-west-1)"
      echo "  --repo         ECR repository name (default: nextjs-frontend)"
      echo "  --env          Environment: dev, staging, prod (default: dev)"
      echo "  --skip-build   Skip Docker build (image already exists)"
      echo "  --skip-sync    Skip S3 static asset sync"
      echo "  --ecr-url      ECR repository URL (skip SSM/account lookup)"
      echo "  --image-name   Pre-built Docker image name (e.g. frontend:latest)"
      echo ""
      echo "Auth modes:"
      echo "  CI/Pipeline:  Omit --profile; uses OIDC credentials from env vars"
      echo "  Local/Manual: Use --profile <name>; uses AWS CLI named profile"
      echo ""
      echo "After pushing, use update-ecs-task.sh to deploy to ECS"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Next.js ECR Push Script${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Determine auth mode: profile (local) vs OIDC (CI)
if [ -n "$AWS_PROFILE" ]; then
  export AWS_PROFILE="$AWS_PROFILE"
  AUTH_MODE="profile ($AWS_PROFILE)"
elif [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  AUTH_MODE="OIDC (env credentials)"
else
  # Fallback to default profile for local usage
  AWS_PROFILE="$DEFAULT_PROFILE"
  export AWS_PROFILE="$AWS_PROFILE"
  AUTH_MODE="profile ($AWS_PROFILE, default)"
fi
export AWS_REGION="$AWS_REGION"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Auth Mode:   $AUTH_MODE"
echo "   AWS Region:  $AWS_REGION"
echo "   Repository:  $REPO_NAME"
echo "   Image Tag:   $IMAGE_TAG"
echo "   Skip Build:  $SKIP_BUILD"
echo ""

# ─── Step 1: Resolve ECR URL ───────────────────────────────────────────────
if [ -n "$ECR_URL" ]; then
  echo -e "${YELLOW}[1/5] Using provided ECR URL...${NC}"
  REPO_URI="$ECR_URL"
  echo -e "${GREEN}✓ ECR URL: $REPO_URI${NC}"
else
  echo -e "${YELLOW}[1/5] Discovering ECR URL...${NC}"
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS Account ID. Check your AWS credentials.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Account ID: $ACCOUNT_ID${NC}"
  ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  REPO_URI="${ECR_REGISTRY}/${REPO_NAME}"
fi

# Extract registry from repo URI for Docker login
ECR_REGISTRY=$(echo "$REPO_URI" | sed 's|/.*||')

# ─── Step 2: Authenticate Docker with ECR ──────────────────────────────────
echo -e "${YELLOW}[2/5] Authenticating Docker with ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo -e "${GREEN}✓ Docker authenticated with ECR${NC}"

# ─── Step 3: Build Docker image (skippable in CI) ─────────────────────────
if [ "$SKIP_BUILD" = true ]; then
  echo -e "${YELLOW}[3/5] Skipping Docker build (--skip-build)${NC}"
  if [ -n "$IMAGE_NAME" ]; then
    LOCAL_IMAGE="$IMAGE_NAME"
  else
    LOCAL_IMAGE="${REPO_NAME}:${IMAGE_TAG}"
  fi
  # Verify image exists locally
  if ! docker image inspect "$LOCAL_IMAGE" > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker image '$LOCAL_IMAGE' not found locally${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Using pre-built image: $LOCAL_IMAGE${NC}"
else
  echo -e "${YELLOW}[3/5] Building Docker image...${NC}"
  LOCAL_IMAGE="${REPO_NAME}:${IMAGE_TAG}"
  cd "$PROJECT_ROOT"
  docker build \
    --platform linux/amd64 \
    --build-arg NODE_ENV=production \
    --build-arg NEXT_TELEMETRY_DISABLED=1 \
    -t "$LOCAL_IMAGE" \
    .
  echo -e "${GREEN}✓ Docker image built: $LOCAL_IMAGE${NC}"
fi

# ─── Step 4: Tag and push to ECR ──────────────────────────────────────────
echo -e "${YELLOW}[4/5] Tagging and pushing to ECR...${NC}"
docker tag "$LOCAL_IMAGE" "${REPO_URI}:${IMAGE_TAG}"
docker tag "$LOCAL_IMAGE" "${REPO_URI}:latest"

docker push "${REPO_URI}:${IMAGE_TAG}"
docker push "${REPO_URI}:latest"
echo -e "${GREEN}✓ Image pushed: ${REPO_URI}:${IMAGE_TAG}${NC}"

# ─── Step 5: Sync static assets to S3 ─────────────────────────────────────
if [ "$SKIP_SYNC" = true ]; then
  echo -e "${YELLOW}[5/5] Skipping S3 sync (--skip-sync)${NC}"
else
  echo -e "${YELLOW}[5/5] Syncing static assets to S3...${NC}"

  # Clear stale local .next/static to avoid hash mismatches
  rm -rf "$PROJECT_ROOT/.next/static"
  mkdir -p "$PROJECT_ROOT/.next"

  # Extract static assets from the Docker image
  echo "   Extracting static assets from Docker image..."
  TEMP_CONTAINER=$(docker create "$LOCAL_IMAGE")

  if ! docker cp "$TEMP_CONTAINER:/app/.next/static" "$PROJECT_ROOT/.next/"; then
    echo -e "${RED}❌ Failed to extract static assets from Docker image${NC}"
    docker rm "$TEMP_CONTAINER" > /dev/null 2>&1 || true
    exit 1
  fi
  docker rm "$TEMP_CONTAINER" > /dev/null

  EXTRACTED_COUNT=$(find "$PROJECT_ROOT/.next/static" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$EXTRACTED_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No static assets extracted from Docker image${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Extracted $EXTRACTED_COUNT static assets${NC}"

  # Sync to S3 and invalidate CloudFront
  if [ -f "$SCRIPT_DIR/sync-static-to-s3.sh" ]; then
    SYNC_ARGS="--env ${ENVIRONMENT} --region $AWS_REGION"
    [ -n "$AWS_PROFILE" ] && SYNC_ARGS="$SYNC_ARGS --profile $AWS_PROFILE"
    $SCRIPT_DIR/sync-static-to-s3.sh $SYNC_ARGS
  else
    echo -e "${YELLOW}⚠️ sync-static-to-s3.sh not found. Skipping S3 sync.${NC}"
  fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Push Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Image URI: ${REPO_URI}:${IMAGE_TAG}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • Deploy to ECS: ./scripts/update-ecs-task.sh --env $ENVIRONMENT"
echo ""
