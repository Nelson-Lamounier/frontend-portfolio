#!/bin/bash
#
# Update API URL Configuration
# Updates .env.local with new API endpoint from CDK output
#

set -e

echo "======================================"
echo "Update API URL Configuration"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

# Prompt for new API URL
echo "Enter your new API URL from CDK output:"
echo "(Example: https://senfi6ytfj.execute-api.eu-west-1.amazonaws.com/api)"
read -p "API URL: " NEW_API_URL

if [ -z "$NEW_API_URL" ]; then
    echo "Error: API URL cannot be empty"
    exit 1
fi

# Validate URL format
if [[ ! "$NEW_API_URL" =~ ^https:// ]]; then
    echo "Error: API URL must start with https://"
    exit 1
fi

# Update .env.local
echo ""
echo "Updating .env.local..."

# Use sed to update the NEXT_PUBLIC_API_URL line
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$NEW_API_URL|" .env.local
else
    # Linux
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$NEW_API_URL|" .env.local
fi

echo "✓ Updated NEXT_PUBLIC_API_URL in .env.local"
echo ""

# Show current configuration
echo "Current Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep "^NEXT_PUBLIC_API_URL=" .env.local || echo "NEXT_PUBLIC_API_URL not found"
grep "^USE_FILE_FALLBACK=" .env.local || echo "USE_FILE_FALLBACK not set"
echo ""

# Test the new API
echo "Testing API connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load the new URL
export $(grep -v '^#' .env.local | grep -v '^$' | xargs)

# Test API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_API_URL/articles")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ API is responding (HTTP $HTTP_CODE)"
    echo ""
    echo "Preview articles:"
    curl -s "$NEXT_PUBLIC_API_URL/articles" | jq '.articles[] | {slug, title}' 2>/dev/null || \
    curl -s "$NEXT_PUBLIC_API_URL/articles" | head -n 20
else
    echo "⚠️  API returned HTTP $HTTP_CODE"
    echo "This might be expected if DynamoDB is empty or Lambda needs time to warm up"
fi

echo ""
echo "======================================"
echo "Configuration Updated!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Test API: yarn test:api"
echo "  2. Start dev server: yarn dev"
echo "  3. Visit: http://localhost:3000/articles"
echo ""
