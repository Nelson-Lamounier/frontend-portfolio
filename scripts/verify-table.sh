#!/bin/bash
#
# Verify DynamoDB table structure for article migration
#

set -e

AWS_REGION="${AWS_REGION:-eu-west-1}"
AWS_PROFILE="${AWS_PROFILE:-}"
TABLE_NAME="${DYNAMODB_TABLE_NAME:-webapp-articles-development}"

# Build AWS CLI options
AWS_OPTS="--region $AWS_REGION"
if [ -n "$AWS_PROFILE" ]; then
    AWS_OPTS="$AWS_OPTS --profile $AWS_PROFILE"
    echo "Using AWS Profile: $AWS_PROFILE"
fi

echo "Checking DynamoDB table: $TABLE_NAME"
echo "Region: $AWS_REGION"
echo ""

# Get table description
TABLE_INFO=$(aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  $AWS_OPTS \
  2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Table '$TABLE_NAME' not found or no access"
    exit 1
fi

echo "✅ Table exists!"
echo ""

# Extract key schema
PK=$(echo "$TABLE_INFO" | jq -r '.Table.KeySchema[] | select(.KeyType=="HASH") | .AttributeName')
SK=$(echo "$TABLE_INFO" | jq -r '.Table.KeySchema[] | select(.KeyType=="RANGE") | .AttributeName')

echo "Key Schema:"
echo "  Partition Key: $PK"
echo "  Sort Key: $SK"
echo ""

# Check if keys match expected schema
if [ "$PK" != "pk" ] || [ "$SK" != "sk" ]; then
    echo "⚠️  Warning: Expected keys 'pk' and 'sk' but found '$PK' and '$SK'"
    echo ""
    echo "The migration script expects:"
    echo "  - Partition Key: pk (String)"
    echo "  - Sort Key: sk (String)"
    echo ""
    echo "Your table has different key names. You'll need to either:"
    echo "  1. Recreate the table with correct keys, OR"
    echo "  2. Modify the migration script to use '$PK' and '$SK'"
    echo ""
    exit 1
fi

# Check GSI
GSI_COUNT=$(echo "$TABLE_INFO" | jq -r '.Table.GlobalSecondaryIndexes | length // 0')
echo "Global Secondary Indexes: $GSI_COUNT"

if [ "$GSI_COUNT" -gt 0 ]; then
    echo "$TABLE_INFO" | jq -r '.Table.GlobalSecondaryIndexes[] | "  - \(.IndexName): \(.KeySchema[0].AttributeName) / \(.KeySchema[1].AttributeName)"'
fi
echo ""

# Check billing mode
BILLING_MODE=$(echo "$TABLE_INFO" | jq -r '.Table.BillingModeSummary.BillingMode // .Table.BillingMode // "PROVISIONED"')
echo "Billing Mode: $BILLING_MODE"

if [ "$BILLING_MODE" = "PROVISIONED" ]; then
    READ_CAPACITY=$(echo "$TABLE_INFO" | jq -r '.Table.ProvisionedThroughput.ReadCapacityUnits')
    WRITE_CAPACITY=$(echo "$TABLE_INFO" | jq -r '.Table.ProvisionedThroughput.WriteCapacityUnits')
    echo "  Read Capacity: $READ_CAPACITY"
    echo "  Write Capacity: $WRITE_CAPACITY"
fi
echo ""

# Check current item count
ITEM_COUNT=$(echo "$TABLE_INFO" | jq -r '.Table.ItemCount')
TABLE_SIZE=$(echo "$TABLE_INFO" | jq -r '.Table.TableSizeBytes')

echo "Current State:"
echo "  Items: $ITEM_COUNT"
echo "  Size: $TABLE_SIZE bytes"
echo ""

if [ "$ITEM_COUNT" -gt 0 ]; then
    echo "ℹ️  Table already contains items"
    echo "   The migration script will skip articles that already exist"
fi

echo ""
echo "✅ Table structure looks good!"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/setup-migration.sh"
echo "  2. Run: yarn migrate:articles:dry-run"
echo "  3. Run: yarn migrate:articles"
