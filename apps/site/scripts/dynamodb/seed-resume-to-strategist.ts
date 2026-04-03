/**
 * seed-resume-to-strategist.ts
 *
 * One-off migration script to seed the hardcoded resume data from
 * the repository into the strategist DynamoDB table.
 *
 * Writes a RESUME#<uuid> item with the full ResumeData JSON and
 * sets it as the active (publicly displayed) resume.
 *
 * Usage:
 *   yarn seed:resume                    — seeds to the strategist table
 *   yarn seed:resume --dry-run          — validates without writing
 *   yarn seed:resume --table <name>     — override table name
 *
 * Environment Variables:
 *   STRATEGIST_TABLE_NAME — target DynamoDB table
 *   AWS_REGION            — AWS region (default: eu-west-1)
 *   AWS_PROFILE           — optional AWS credentials profile
 */

import { randomUUID } from 'node:crypto'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

// Import the hardcoded resume data from the codebase
import { resumeData } from '../../../../packages/shared/src/lib/resumes/resume-data'

// =========================================================================
// CLI argument parsing
// =========================================================================

const args = process.argv.slice(2)

/** Whether to validate only, without writing to DynamoDB */
const DRY_RUN = args.includes('--dry-run')

/** Custom table name override */
const tableOverrideIdx = args.indexOf('--table')
const TABLE_OVERRIDE = tableOverrideIdx >= 0 ? args[tableOverrideIdx + 1] : undefined

// =========================================================================
// Configuration
// =========================================================================

const TABLE_NAME = TABLE_OVERRIDE || process.env.STRATEGIST_TABLE_NAME || ''
const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Label for the seeded resume */
const RESUME_LABEL = 'AWS DevOps Engineer — Primary'

// =========================================================================
// Helpers
// =========================================================================

/**
 * Creates a DynamoDB Document client with the configured region.
 *
 * @returns Configured DynamoDBDocumentClient
 */
function createDocClient(): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region: REGION })
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  })
}

/**
 * Logs a step with a consistent prefix.
 *
 * @param emoji - Status emoji
 * @param message - Log message
 */
function log(emoji: string, message: string): void {
  console.log(`  ${emoji}  ${message}`)
}

// =========================================================================
// Main
// =========================================================================

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   Resume → Strategist Table Seed Script         ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  // Validate configuration
  if (!TABLE_NAME) {
    console.error('❌ No table name provided.')
    console.error('   Set STRATEGIST_TABLE_NAME env var or use --table <name>')
    process.exit(1)
  }

  log('📋', `Table:     ${TABLE_NAME}`)
  log('🌍', `Region:    ${REGION}`)
  log('🏷️ ', `Label:     ${RESUME_LABEL}`)
  log('📄', `Profile:   ${resumeData.profile.name} — ${resumeData.profile.title}`)
  log('📊', `Sections:  ${resumeData.experience.length} experience, ${resumeData.skills.length} skill groups, ${resumeData.projects.length} projects`)
  console.log('')

  if (DRY_RUN) {
    log('⏭️ ', 'DRY RUN — skipping DynamoDB write')
    console.log('\n✅ Validation passed. Run without --dry-run to seed.\n')
    return
  }

  const docClient = createDocClient()
  const resumeId = randomUUID()
  const now = new Date().toISOString()

  // Step 1: Check for existing resumes and deactivate them
  log('🔍', 'Checking for existing active resumes...')

  const existingScan = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type AND sk = :sk',
      ExpressionAttributeValues: {
        ':type': 'RESUME',
        ':sk': 'METADATA',
      },
    }),
  )

  const existingResumes = existingScan.Items ?? []
  if (existingResumes.length > 0) {
    log('📦', `Found ${existingResumes.length} existing resume(s) — deactivating...`)

    for (const item of existingResumes) {
      if (item['isActive'] === true) {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk: item['pk'], sk: item['sk'] },
            UpdateExpression: 'SET isActive = :inactive, updatedAt = :now',
            ExpressionAttributeValues: {
              ':inactive': false,
              ':now': now,
            },
          }),
        )
        log('🔄', `Deactivated: ${String(item['label'] ?? item['pk'])}`)
      }
    }
  } else {
    log('✨', 'No existing resumes — this is a fresh seed')
  }

  // Step 2: Write the new resume entity
  log('💾', `Writing resume ${resumeId}...`)

  const entity = {
    pk: `RESUME#${resumeId}`,
    sk: 'METADATA',
    gsi1pk: 'RESUME',
    gsi1sk: `RESUME#${now}`,
    entityType: 'RESUME',
    resumeId,
    label: RESUME_LABEL,
    isActive: true,
    data: resumeData,
    createdAt: now,
    updatedAt: now,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: entity,
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  )

  log('✅', `Resume seeded successfully!`)
  log('🆔', `ID:      ${resumeId}`)
  log('🔑', `PK:      RESUME#${resumeId}`)
  log('🟢', `Active:  true`)
  log('📅', `Created: ${now}`)

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   ✅  Resume migration complete                  ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  console.log('Next steps:')
  console.log('  1. Verify in /admin/resumes — the seeded resume should appear')
  console.log('  2. The strategist pipeline agents will read from this table directly')
  console.log('  3. Update CDK: grant Lambda dynamodb:Scan on the strategist table')
  console.log('     for RESUME# items (entityType = "RESUME", isActive = true)')
  console.log('')
}

try {
  await main()
} catch (err) {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
}
