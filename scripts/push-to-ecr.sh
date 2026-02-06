#!/bin/bash
# push-to-ecr.sh
# Script to build and push Next.js Docker image to Amazon ECR
# This script ONLY handles image build/push - use update-ecs-task.sh for deployments
#
# Usage: ./scripts/push-to-ecr.sh [--tag <tag>] [--profile <aws-profile>] [--region <aws-region>]

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
AWS_PROFILE="${AWS_PROFILE:-$DEFAULT_PROFILE}"
IMAGE_TAG="${IMAGE_TAG:-$DEFAULT_TAG}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

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
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Build and push Docker image to ECR, then sync static assets to S3"
      echo ""
      echo "Options:"
      echo "  --tag      Docker image tag (default: latest)"
      echo "  --profile  AWS CLI profile (default: dev-account)"
      echo "  --region   AWS region (default: eu-west-1)"
      echo "  --repo     ECR repository name (default: nextjs-frontend)"
      echo "  --env      Environment: dev, staging, prod (default: dev)"
      echo ""
      echo "SSM Parameters (auto-discovered based on --env):"
      echo "  /nextjs/{env}/s3/static-assets-bucket"
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

# Export AWS profile
export AWS_PROFILE="$AWS_PROFILE"
export AWS_REGION="$AWS_REGION"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   AWS Profile: $AWS_PROFILE"
echo "   AWS Region:  $AWS_REGION"
echo "   Repository:  $REPO_NAME"
echo "   Image Tag:   $IMAGE_TAG"
echo ""

# Step 1: Get AWS Account ID
echo -e "${YELLOW}[1/5] Getting AWS Account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}❌ Failed to get AWS Account ID. Check your AWS credentials.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Account ID: $ACCOUNT_ID${NC}"

# Build ECR URI
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
REPO_URI="${ECR_URI}/${REPO_NAME}"

# Step 2: Authenticate Docker with ECR
echo -e "${YELLOW}[2/5] Authenticating Docker with ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URI"
echo -e "${GREEN}✓ Docker authenticated with ECR${NC}"

# Step 3: Build Docker image
echo -e "${YELLOW}[3/6] Building Docker image...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
docker build \
  --platform linux/amd64 \
  --build-arg NODE_ENV=production \
  --build-arg NEXT_TELEMETRY_DISABLED=1 \
  -t "${REPO_NAME}:${IMAGE_TAG}" \
  .
echo -e "${GREEN}✓ Docker image built: ${REPO_NAME}:${IMAGE_TAG}${NC}"

# Step 4: Tag image for ECR
echo -e "${YELLOW}[4/6] Tagging image for ECR...${NC}"
docker tag "${REPO_NAME}:${IMAGE_TAG}" "${REPO_URI}:${IMAGE_TAG}"
echo -e "${GREEN}✓ Tagged: ${REPO_URI}:${IMAGE_TAG}${NC}"

# Step 5: Push to ECR
echo -e "${YELLOW}[5/6] Pushing image to ECR...${NC}"
docker push "${REPO_URI}:${IMAGE_TAG}"
echo -e "${GREEN}✓ Image pushed successfully${NC}"

# Step 6: Sync static assets to S3 (for CloudFront)
echo -e "${YELLOW}[6/6] Syncing static assets to S3...${NC}"

# IMPORTANT: Clear any stale local .next/static to avoid hash mismatches
rm -rf "$PROJECT_ROOT/.next/static"
mkdir -p "$PROJECT_ROOT/.next"

# Extract static assets from the SAME Docker image we just built
echo "   Extracting static assets from Docker image..."
TEMP_CONTAINER=$(docker create "${REPO_NAME}:${IMAGE_TAG}")

if ! docker cp "$TEMP_CONTAINER:/app/.next/static" "$PROJECT_ROOT/.next/"; then
  echo -e "${RED}❌ Failed to extract static assets from Docker image${NC}"
  docker rm "$TEMP_CONTAINER" > /dev/null 2>&1 || true
  exit 1
fi
docker rm "$TEMP_CONTAINER" > /dev/null

# Verify extraction
EXTRACTED_COUNT=$(find "$PROJECT_ROOT/.next/static" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$EXTRACTED_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ No static assets extracted from Docker image${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Extracted $EXTRACTED_COUNT static assets${NC}"

# Sync to S3 using the sync script
if [ -f "$SCRIPT_DIR/sync-static-to-s3.sh" ]; then
  "$SCRIPT_DIR/sync-static-to-s3.sh" \
    --env "${ENVIRONMENT}" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION"
else
  echo -e "${YELLOW}⚠️ sync-static-to-s3.sh not found. Skipping S3 sync.${NC}"
  echo -e "${YELLOW}   Run ./scripts/sync-static-to-s3.sh manually.${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Build, Push & Sync Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Image URI: ${REPO_URI}:${IMAGE_TAG}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • First deployment: Deploy ECS service via CDK"
echo "  • Subsequent deployments: Run ./scripts/update-ecs-task.sh --env <env>"
echo ""

