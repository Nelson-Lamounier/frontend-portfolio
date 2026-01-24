#!/bin/bash
#
# Test Articles API Endpoints
#

# Function to read value from .env.local
get_env_value() {
    local key=$1
    local file=".env.local"
    
    if [ -f "$file" ]; then
        # Extract value for the given key, removing quotes and whitespace
        grep "^${key}=" "$file" | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//"
    fi
}

# Get API base URL from .env.local
API_BASE_URL=$(get_env_value "NEXT_PUBLIC_API_URL")

if [ -z "$API_BASE_URL" ]; then
    echo "Error: NEXT_PUBLIC_API_URL not set in .env.local"
    echo ""
    echo "Please set NEXT_PUBLIC_API_URL in .env.local or run:"
    echo "  yarn config:update-api"
    exit 1
fi

echo "======================================"
echo "Testing Articles API"
echo "======================================"
echo ""
echo "API Base URL: $API_BASE_URL"
echo ""

# Test 1: List all articles
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: GET /articles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request:"
echo "  curl $API_BASE_URL/articles"
echo ""
echo "Response:"
curl -s "$API_BASE_URL/articles" | jq '.' 2>/dev/null || curl -s "$API_BASE_URL/articles"
echo ""
echo ""

# Test 2: Get specific article
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: GET /articles/{slug}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
SLUG="aws-devops-pro-exam-failure-to-success"
echo "Request:"
echo "  curl $API_BASE_URL/articles/$SLUG"
echo ""
echo "Response:"
curl -s "$API_BASE_URL/articles/$SLUG" | jq '.' 2>/dev/null || curl -s "$API_BASE_URL/articles/$SLUG"
echo ""
echo ""

# Test 3: Get articles by tag
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: GET /articles/tag/{tag}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
TAG="aws"
echo "Request:"
echo "  curl $API_BASE_URL/articles/tag/$TAG"
echo ""
echo "Response:"
curl -s "$API_BASE_URL/articles/tag/$TAG" | jq '.' 2>/dev/null || curl -s "$API_BASE_URL/articles/tag/$TAG"
echo ""
echo ""

# Test 4: Check response headers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Check Response Headers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request:"
echo "  curl -s -D - -o /dev/null $API_BASE_URL/articles"
echo ""
echo "Response Headers:"
curl -s -D - -o /dev/null "$API_BASE_URL/articles"
echo ""

echo "======================================"
echo "Testing Complete"
echo "======================================"
