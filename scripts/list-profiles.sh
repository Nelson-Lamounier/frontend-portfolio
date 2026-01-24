#!/bin/bash
#
# List available AWS profiles and test them
#

echo "======================================"
echo "AWS Profile Helper"
echo "======================================"
echo ""

# Check if credentials file exists
if [ ! -f ~/.aws/credentials ]; then
    echo "❌ No AWS credentials file found at ~/.aws/credentials"
    echo ""
    echo "Set up AWS credentials:"
    echo "  $ aws configure"
    echo ""
    exit 1
fi

# List profiles
echo "Available AWS Profiles:"
echo ""
PROFILES=$(grep '^\[' ~/.aws/credentials | sed 's/\[//' | sed 's/\]//')

if [ -z "$PROFILES" ]; then
    echo "  (No profiles found)"
    exit 1
fi

# Show current profile
if [ -n "$AWS_PROFILE" ]; then
    echo "Current profile: $AWS_PROFILE ✓"
    echo ""
fi

# List and test each profile
while IFS= read -r profile; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Profile: $profile"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Test the profile
    RESULT=$(aws sts get-caller-identity --profile "$profile" 2>&1)
    
    if [ $? -eq 0 ]; then
        ACCOUNT=$(echo "$RESULT" | grep -o '"Account": "[^"]*"' | cut -d'"' -f4)
        USER_ARN=$(echo "$RESULT" | grep -o '"Arn": "[^"]*"' | cut -d'"' -f4)
        echo "  Status: ✓ Valid"
        echo "  Account: $ACCOUNT"
        echo "  Identity: $USER_ARN"
        
        # Check region
        REGION=$(aws configure get region --profile "$profile" 2>/dev/null || echo "not set")
        echo "  Region: $REGION"
    else
        echo "  Status: ✗ Invalid or expired"
        echo "  Error: $(echo "$RESULT" | head -n1)"
    fi
    echo ""
done <<< "$PROFILES"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To use a profile for migration:"
echo "  $ export AWS_PROFILE=your-profile-name"
echo "  $ ./scripts/setup-migration.sh"
echo ""
