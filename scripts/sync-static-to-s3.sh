#!/bin/bash
# sync-static-to-s3.sh
# Script to sync Next.js static assets to S3 for CloudFront serving
# and optionally invalidate CloudFront cache.
#
# Auth modes:
#   - CI/Pipeline: Uses OIDC (credentials from env vars, no --profile needed)
#   - Local/Manual: Uses AWS CLI profile (--profile flag)
#
# Usage: ./scripts/sync-static-to-s3.sh --env <environment> [--profile <aws-profile>]

set -euo pipefail

# Default configuration
DEFAULT_REGION="eu-west-1"
DEFAULT_PROFILE="dev-account"
DEFAULT_ENV="dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
AWS_REGION="${AWS_REGION:-$DEFAULT_REGION}"
AWS_PROFILE="${AWS_PROFILE:-}"
ENVIRONMENT="${ENVIRONMENT:-$DEFAULT_ENV}"
SKIP_INVALIDATION=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENVIRONMENT="$2"
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
    --skip-invalidation)
      SKIP_INVALIDATION=true
      shift
      ;;
    --help)
      echo "Usage: $0 --env <environment> [OPTIONS]"
      echo ""
      echo "Sync Next.js static assets to S3 bucket and invalidate CloudFront cache"
      echo ""
      echo "Options:"
      echo "  --env                Environment: dev, staging, prod (required)"
      echo "  --profile            AWS CLI profile (default: auto-detect)"
      echo "  --region             AWS region (default: eu-west-1)"
      echo "  --skip-invalidation  Skip CloudFront cache invalidation"
      echo ""
      echo "Auth modes:"
      echo "  CI/Pipeline:  Omit --profile; uses OIDC credentials from env vars"
      echo "  Local/Manual: Use --profile <name>; uses AWS CLI named profile"
      echo ""
      echo "SSM Parameters (auto-discovered based on --env):"
      echo "  /nextjs/{env}/s3/static-assets-bucket"
      echo "  /nextjs/{env}/cloudfront/distribution-id"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Static Assets S3 Sync Script${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Determine auth mode: profile (local) vs OIDC (CI)
AWS_CMD_OPTS=""
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

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Auth Mode:    $AUTH_MODE"
echo "   AWS Region:   $AWS_REGION"
echo "   Environment:  $ENVIRONMENT"
echo ""

# Determine project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STATIC_DIR="$PROJECT_ROOT/.next/static"

# Step 1: Verify static directory exists
echo -e "${YELLOW}[1/5] Verifying static assets directory...${NC}"
if [ ! -d "$STATIC_DIR" ]; then
  echo -e "${RED}❌ Static assets not found at: $STATIC_DIR${NC}"
  echo -e "${YELLOW}   Run 'yarn build' first to generate static assets.${NC}"
  exit 1
fi
ASSET_COUNT=$(find "$STATIC_DIR" -type f | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Found $ASSET_COUNT static assets${NC}"

# Step 2: Get S3 bucket name from SSM
echo -e "${YELLOW}[2/5] Discovering S3 bucket from SSM...${NC}"

# Try known SSM paths in order of preference
SSM_PATHS=(
  "/nextjs/${ENVIRONMENT}/assets-bucket-name"
  "/nextjs/${ENVIRONMENT}/s3/static-assets-bucket"
)

BUCKET_NAME=""
for SSM_PARAM in "${SSM_PATHS[@]}"; do
  echo "   Trying: $SSM_PARAM"
  BUCKET_NAME=$(aws ssm get-parameter \
    --name "$SSM_PARAM" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

  if [ -n "$BUCKET_NAME" ] && [ "$BUCKET_NAME" != "None" ]; then
    echo -e "${GREEN}   ✓ Found via: $SSM_PARAM${NC}"
    break
  fi
  BUCKET_NAME=""
done

if [ -z "$BUCKET_NAME" ]; then
  echo -e "${YELLOW}⚠️ SSM parameter not found. Trying alternative discovery...${NC}"
  
  # Fallback: Try common bucket naming patterns
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  BUCKET_NAME="nextjs-static-assets-${ENVIRONMENT}-${ACCOUNT_ID}"
  
  # Verify bucket exists
  if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${RED}❌ Could not find S3 bucket.${NC}"
    echo -e "${YELLOW}   Create one of these SSM parameters:${NC}"
    for P in "${SSM_PATHS[@]}"; do
      echo -e "${YELLOW}     - $P${NC}"
    done
    exit 1
  fi
fi

# Strip s3:// prefix and trailing slash if present
BUCKET_NAME="${BUCKET_NAME#s3://}"
BUCKET_NAME="${BUCKET_NAME%/}"

echo -e "${GREEN}✓ Bucket: $BUCKET_NAME${NC}"

# Step 3: Sync static assets to S3
echo -e "${YELLOW}[3/5] Syncing static assets to S3...${NC}"
echo "   Source:      $STATIC_DIR"
echo "   Destination: s3://$BUCKET_NAME/_next/static/"

aws s3 sync "$STATIC_DIR" "s3://$BUCKET_NAME/_next/static/" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

echo -e "${GREEN}✓ Static assets synced${NC}"

# Step 4: Verify sync
echo -e "${YELLOW}[4/5] Verifying upload...${NC}"
UPLOADED_COUNT=$(aws s3 ls "s3://$BUCKET_NAME/_next/static/" --recursive | wc -l | tr -d ' ')
echo -e "${GREEN}✓ $UPLOADED_COUNT files in S3${NC}"

# Step 5: CloudFront Cache Invalidation
echo -e "${YELLOW}[5/5] CloudFront cache invalidation...${NC}"

if [ "$SKIP_INVALIDATION" = true ]; then
  echo -e "${YELLOW}⏩ Skipping CloudFront invalidation (--skip-invalidation)${NC}"
else
  SSM_CF_PARAM="/nextjs/${ENVIRONMENT}/cloudfront/distribution-id"
  echo "   Looking up: $SSM_CF_PARAM"

  DISTRIBUTION_ID=$(aws ssm get-parameter \
    --name "$SSM_CF_PARAM" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

  if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    echo -e "${YELLOW}⚠️ CloudFront distribution ID not found in SSM. Skipping invalidation.${NC}"
    echo -e "${YELLOW}   Create SSM parameter: $SSM_CF_PARAM${NC}"
  else
    echo "   Distribution: $DISTRIBUTION_ID"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
      --distribution-id "$DISTRIBUTION_ID" \
      --paths "/_next/static/*" \
      --query 'Invalidation.Id' \
      --output text)

    echo -e "${GREEN}✓ CloudFront invalidation created: $INVALIDATION_ID${NC}"
  fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Static Assets Sync Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo "  S3 Bucket:    $BUCKET_NAME"
echo "  S3 Prefix:    /_next/static/"
echo "  Files Synced: $UPLOADED_COUNT"
echo ""
