#!/bin/bash
# update-ecs-task.sh
# Script to trigger ECS service update with force-new-deployment
# Uses SSM Parameter Store to discover cluster/service names
#
# Usage: ./scripts/update-ecs-task.sh --env <environment> [--profile <aws-profile>] [--region <aws-region>]

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
AWS_PROFILE="${AWS_PROFILE:-$DEFAULT_PROFILE}"
ENVIRONMENT="${ENVIRONMENT:-$DEFAULT_ENV}"

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
    --help)
      echo "Usage: $0 --env <environment> [OPTIONS]"
      echo ""
      echo "Trigger ECS service update (force-new-deployment)"
      echo ""
      echo "Options:"
      echo "  --env      Environment: dev, staging, prod (required)"
      echo "  --profile  AWS CLI profile (default: dev-account)"
      echo "  --region   AWS region (default: eu-west-1)"
      echo ""
      echo "SSM Parameters (auto-discovered based on --env):"
      echo "  /nextjs/{env}/ecs/cluster-name"
      echo "  /nextjs/{env}/ecs/service-name"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔄 ECS Task Update Script${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Export AWS profile
export AWS_PROFILE="$AWS_PROFILE"
export AWS_REGION="$AWS_REGION"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   AWS Profile:  $AWS_PROFILE"
echo "   AWS Region:   $AWS_REGION"
echo "   Environment:  $ENVIRONMENT"
echo ""

# Step 1: Verify AWS credentials
echo -e "${YELLOW}[1/3] Verifying AWS credentials...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}❌ Failed to get AWS Account ID. Check your AWS credentials.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Account ID: $ACCOUNT_ID${NC}"

# Step 2: Discover ECS cluster/service from SSM
echo -e "${YELLOW}[2/3] Discovering ECS configuration from SSM...${NC}"

SSM_CLUSTER_PARAM="/nextjs/${ENVIRONMENT}/ecs/cluster-name"
SSM_SERVICE_PARAM="/nextjs/${ENVIRONMENT}/ecs/service-name"

echo "   Looking up: $SSM_CLUSTER_PARAM"
CLUSTER_NAME=$(aws ssm get-parameter \
  --name "$SSM_CLUSTER_PARAM" \
  --query 'Parameter.Value' \
  --output text 2>/dev/null || echo "")

if [ -z "$CLUSTER_NAME" ] || [ "$CLUSTER_NAME" = "None" ]; then
  echo -e "${RED}❌ Failed to get ECS cluster name from SSM parameter: $SSM_CLUSTER_PARAM${NC}"
  echo -e "${YELLOW}   Ensure the SSM parameter exists in the target environment.${NC}"
  echo -e "${YELLOW}   This parameter is created when the ECS service is deployed via CDK.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Cluster: $CLUSTER_NAME${NC}"

echo "   Looking up: $SSM_SERVICE_PARAM"
SERVICE_NAME=$(aws ssm get-parameter \
  --name "$SSM_SERVICE_PARAM" \
  --query 'Parameter.Value' \
  --output text 2>/dev/null || echo "")

if [ -z "$SERVICE_NAME" ] || [ "$SERVICE_NAME" = "None" ]; then
  echo -e "${RED}❌ Failed to get ECS service name from SSM parameter: $SSM_SERVICE_PARAM${NC}"
  echo -e "${YELLOW}   Ensure the SSM parameter exists in the target environment.${NC}"
  echo -e "${YELLOW}   This parameter is created when the ECS service is deployed via CDK.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Service: $SERVICE_NAME${NC}"

# Step 3: Force new deployment
echo -e "${YELLOW}[3/3] Triggering ECS service update...${NC}"
echo "   Cluster: $CLUSTER_NAME"
echo "   Service: $SERVICE_NAME"

aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$SERVICE_NAME" \
  --force-new-deployment \
  --output text > /dev/null

echo -e "${GREEN}✓ ECS service update triggered${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Task Update Initiated!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo "  ECS Cluster:  $CLUSTER_NAME"
echo "  ECS Service:  $SERVICE_NAME"
echo ""
echo -e "${YELLOW}📋 Monitor deployment progress:${NC}"
echo "  aws ecs describe-services \\"
echo "    --cluster $CLUSTER_NAME \\"
echo "    --services $SERVICE_NAME \\"
echo "    --query 'services[0].deployments'"
echo ""
