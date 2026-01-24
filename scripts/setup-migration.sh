#!/bin/bash
#
# Setup script for article migration
# Run this before migrating articles to DynamoDB
#

set -e  # Exit on error

echo "======================================"
echo "Article Migration - Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
AWS_REGION="${AWS_REGION:-eu-west-1}"
AWS_PROFILE="${AWS_PROFILE:-}"
DYNAMODB_TABLE_NAME="${DYNAMODB_TABLE_NAME:-webapp-articles-development}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-webapp-article-assets-development}"

# Build AWS CLI options
AWS_OPTS=""
if [ -n "$AWS_PROFILE" ]; then
    AWS_OPTS="--profile $AWS_PROFILE"
    echo -e "${BLUE}Using AWS Profile: $AWS_PROFILE${NC}"
fi

echo "Configuration:"
echo "  AWS Region: $AWS_REGION"
if [ -n "$AWS_PROFILE" ]; then
    echo "  AWS Profile: $AWS_PROFILE"
fi
echo "  DynamoDB Table: $DYNAMODB_TABLE_NAME"
echo "  S3 Bucket: $S3_BUCKET_NAME"
echo ""

# Step 1: Check AWS credentials
echo -e "${YELLOW}[1/4] Checking AWS credentials...${NC}"
if aws sts get-caller-identity $AWS_OPTS &>/dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity $AWS_OPTS --query Account --output text)
    CALLER_ARN=$(aws sts get-caller-identity $AWS_OPTS --query Arn --output text)
    echo -e "${GREEN}✓ AWS credentials configured${NC}"
    echo "  Account: $ACCOUNT_ID"
    echo "  Identity: $CALLER_ARN"
else
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo ""
    echo "Options:"
    echo "  1. Configure AWS CLI: ${YELLOW}aws configure${NC}"
    echo "  2. Use a profile: ${YELLOW}export AWS_PROFILE=your-profile-name${NC}"
    echo "  3. Set credentials:"
    echo "     ${YELLOW}export AWS_ACCESS_KEY_ID=xxx${NC}"
    echo "     ${YELLOW}export AWS_SECRET_ACCESS_KEY=xxx${NC}"
    echo ""
    echo "Available profiles:"
    if [ -f ~/.aws/credentials ]; then
        grep '^\[' ~/.aws/credentials | sed 's/\[/  - /' | sed 's/\]//'
    else
        echo "  (No profiles found in ~/.aws/credentials)"
    fi
    exit 1
fi
echo ""

# Step 2: Check DynamoDB table
echo -e "${YELLOW}[2/4] Checking DynamoDB table...${NC}"
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE_NAME" --region "$AWS_REGION" $AWS_OPTS &>/dev/null; then
    echo -e "${GREEN}✓ DynamoDB table '$DYNAMODB_TABLE_NAME' exists${NC}"
else
    echo -e "${RED}✗ DynamoDB table '$DYNAMODB_TABLE_NAME' not found${NC}"
    echo "Please create the table first or update DYNAMODB_TABLE_NAME environment variable"
    exit 1
fi
echo ""

# Step 3: Check/Create S3 bucket
echo -e "${YELLOW}[3/4] Checking S3 bucket...${NC}"
if aws s3 ls "s3://$S3_BUCKET_NAME" --region "$AWS_REGION" $AWS_OPTS &>/dev/null; then
    echo -e "${GREEN}✓ S3 bucket '$S3_BUCKET_NAME' exists${NC}"
else
    echo -e "${YELLOW}S3 bucket '$S3_BUCKET_NAME' not found${NC}"
    read -p "Create S3 bucket now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating S3 bucket..."
        aws s3 mb "s3://$S3_BUCKET_NAME" --region "$AWS_REGION" $AWS_OPTS
        
        # Enable versioning
        echo "Enabling versioning..."
        aws s3api put-bucket-versioning \
            --bucket "$S3_BUCKET_NAME" \
            --versioning-configuration Status=Enabled \
            $AWS_OPTS
        
        echo -e "${GREEN}✓ S3 bucket created and versioning enabled${NC}"
    else
        echo -e "${RED}Migration requires an S3 bucket for images${NC}"
        exit 1
    fi
fi
echo ""

# Step 4: Check dependencies
echo -e "${YELLOW}[4/4] Checking Node.js dependencies...${NC}"
if [ ! -d "node_modules/@aws-sdk/client-dynamodb" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    yarn install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# Create .env.migration file
echo "Creating .env.migration file..."
cat > .env.migration << EOF
# Article Migration Configuration
# Generated: $(date)

# Required
AWS_REGION=$AWS_REGION
DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE_NAME
S3_BUCKET_NAME=$S3_BUCKET_NAME

# AWS Profile (if using named profiles)
$(if [ -n "$AWS_PROFILE" ]; then echo "AWS_PROFILE=$AWS_PROFILE"; else echo "# AWS_PROFILE="; fi)

# Optional - set if you have CloudFront configured
CLOUDFRONT_DOMAIN=

# For testing only
# DRY_RUN=true
EOF

echo -e "${GREEN}✓ Created .env.migration${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Load environment variables:"
echo "   ${YELLOW}export \$(cat .env.migration | xargs)${NC}"
if [ -n "$AWS_PROFILE" ]; then
    echo "   or"
    echo "   ${YELLOW}AWS_PROFILE=$AWS_PROFILE source .env.migration${NC}"
fi
echo ""
echo "2. Preview migration (dry run):"
echo "   ${YELLOW}yarn migrate:articles:dry-run${NC}"
echo ""
echo "3. Run actual migration:"
echo "   ${YELLOW}yarn migrate:articles${NC}"
echo ""
echo "See docs/MIGRATION_QUICK_START.md for detailed instructions."
echo ""
