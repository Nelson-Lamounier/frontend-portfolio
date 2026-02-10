#!/usr/bin/env tsx
/**
 * Post-Migration Verification Script
 *
 * Smoke test that verifies articles were successfully migrated to DynamoDB.
 * Intended to run as a pipeline step after migration to fail the build
 * if the table is empty.
 *
 * Usage:
 *   npx tsx scripts/dynamodb/verify-migration.ts --env development
 *   npx tsx scripts/dynamodb/verify-migration.ts --env dev --profile dev-account
 */

import {
  DynamoDBClient,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import * as log from '../lib/logger.js'
import {
  parseArgs,
  buildAwsConfig,
  getSSMParameterWithFallbacks,
} from '../lib/aws-helpers.js'

// ========================================
// CLI Arguments
// ========================================

const args = parseArgs(
  [
    { name: 'env', description: 'Environment: dev, development, staging, prod', hasValue: true, default: 'dev' },
    { name: 'profile', description: 'AWS CLI profile', hasValue: true },
    { name: 'region', description: 'AWS region', hasValue: true, default: 'eu-west-1' },
  ],
  'Verify that DynamoDB table has been populated with article data',
)

// ========================================
// Main
// ========================================

async function main(): Promise<void> {
  const config = buildAwsConfig(args)

  log.header('🔍 Post-Migration Verification')
  log.config('Configuration', {
    'AWS Region': config.region,
    'Environment': config.environment,
  })

  const totalSteps = 3

  // Step 1: Resolve table name from SSM
  log.step(1, totalSteps, 'Discovering DynamoDB table from SSM...')

  let tableName = process.env.DYNAMODB_TABLE_NAME
  if (!tableName) {
    const tableResult = await getSSMParameterWithFallbacks(
      [
        `/nextjs/${config.environment}/dynamodb-table-name`,
        `/nextjs/${config.environment}/dynamodb/table-name`,
      ],
      config,
    )
    if (tableResult) {
      tableName = tableResult.value
    } else {
      log.fatal(
        `DynamoDB table name not found in SSM.\n` +
        `   Searched paths:\n` +
        `     /nextjs/${config.environment}/dynamodb-table-name\n` +
        `     /nextjs/${config.environment}/dynamodb/table-name`,
      )
    }
  }
  log.success(`Table: ${tableName}`)

  // Create DynamoDB client
  const dynamoClient = new DynamoDBClient({
    region: config.region,
    credentials: config.credentials,
  })
  const docClient = DynamoDBDocumentClient.from(dynamoClient)

  // Step 2: Describe table to check item count
  log.step(2, totalSteps, 'Checking table status...')

  const describeResult = await dynamoClient.send(
    new DescribeTableCommand({ TableName: tableName }),
  )

  const tableStatus = describeResult.Table?.TableStatus
  const approxItemCount = describeResult.Table?.ItemCount ?? 0

  console.log(`   Table status: ${tableStatus}`)
  console.log(`   Approximate item count: ${approxItemCount}`)

  if (tableStatus !== 'ACTIVE') {
    log.fatal(`Table is not ACTIVE (status: ${tableStatus}). Migration may have failed.`)
  }

  // Step 3: Scan for article metadata items to confirm actual data
  log.step(3, totalSteps, 'Verifying article data exists...')

  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':type': 'ARTICLE_METADATA',
      },
      Select: 'COUNT',
    }),
  )

  const articleCount = scanResult.Count ?? 0

  if (articleCount === 0) {
    log.fatal(
      `No articles found in DynamoDB table '${tableName}'.\n` +
      `   The migration step may have failed silently or used the wrong table.\n` +
      `   Table item count from DescribeTable: ${approxItemCount}\n` +
      `   Articles found via Scan: ${articleCount}`,
    )
  }

  // Fetch a sample to display
  const sampleResult = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':type': 'ARTICLE_METADATA',
      },
      ProjectionExpression: 'slug, title',
      Limit: 10,
    }),
  )

  log.success(`Found ${articleCount} articles in DynamoDB`)
  console.log('')

  if (sampleResult.Items && sampleResult.Items.length > 0) {
    console.log('Sample articles:')
    for (const item of sampleResult.Items) {
      console.log(`  ✓ ${item.slug} — ${item.title}`)
    }
  }

  log.summary('Verification Passed', {
    'Table': tableName!,
    'Status': tableStatus!,
    'Article Count': String(articleCount),
  })
}

main().catch((error) => {
  log.fatal(`Verification failed: ${error.message}`)
})
