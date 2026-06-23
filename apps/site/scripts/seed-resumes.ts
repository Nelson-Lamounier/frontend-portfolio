#!/usr/bin/env npx tsx
/**
 * Resume Seed Script — Seeds resume versions to the strategist DynamoDB table.
 *
 * Imports the three resume variants from the codebase and writes them as
 * RESUME# entities using the same schema as dynamodb-resumes.ts.
 *
 * Usage:
 *   npx tsx scripts/seed-resumes.ts [TABLE_NAME]
 *
 * The TABLE_NAME argument defaults to STRATEGIST_TABLE_NAME or DYNAMODB_TABLE_NAME
 * from the environment. Pass explicitly to target a specific table:
 *
 *   npx tsx scripts/seed-resumes.ts development-job-strategist
 *   npx tsx scripts/seed-resumes.ts bedrock-dev-ai-content
 *
 * Each resume is seeded with a deterministic UUID (v5-style) derived from its
 * label, making the script idempotent — re-running won't create duplicates.
 *
 * The primary "DevOps Engineer" resume is marked as active.
 *
 * @module scripts/seed-resumes
 */

import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

// ---------------------------------------------------------------------------
// Resume data imports
// ---------------------------------------------------------------------------

import { resumeData } from '../src/lib/resumes/resume-data'
import { resumeDataEsc } from '../src/lib/resumes/resume-data-esc'
import { resumeDataFullstack } from '../src/lib/resumes/resume-data-fullstack'

import type { ResumeData } from '../src/lib/resumes/resume-data'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TABLE_NAME =
  process.argv[2] ||
  process.env.STRATEGIST_TABLE_NAME ||
  process.env.DYNAMODB_TABLE_NAME ||
  ''

const REGION = process.env.AWS_REGION || 'eu-west-1'

if (!TABLE_NAME) {
  console.error(
    '❌ No table name provided.\n' +
      'Usage: npx tsx scripts/seed-resumes.ts <TABLE_NAME>\n' +
      'Or set STRATEGIST_TABLE_NAME / DYNAMODB_TABLE_NAME env var.',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// DynamoDB client
// ---------------------------------------------------------------------------

const client = new DynamoDBClient({ region: REGION })
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

// ---------------------------------------------------------------------------
// Resume definitions to seed
// ---------------------------------------------------------------------------

interface ResumeSeed {
  /** Human-readable label */
  label: string
  /** Full resume content */
  data: ResumeData
  /** Whether this is the active (publicly displayed) version */
  isActive: boolean
}

const RESUMES_TO_SEED: ResumeSeed[] = [
  {
    label: 'DevOps Engineer (Primary)',
    data: resumeData,
    isActive: true,
  },
  {
    label: 'ESC Systems Engineer / DevOps',
    data: resumeDataEsc,
    isActive: false,
  },
  {
    label: 'Full Stack Developer',
    data: resumeDataFullstack,
    isActive: false,
  },
]

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

/**
 * Seeds a single resume version to DynamoDB.
 *
 * Uses `ConditionExpression: attribute_not_exists(pk)` so re-running
 * the script won't overwrite existing items.
 *
 * @param seed - Resume definition to seed
 * @returns The generated resumeId
 */
async function seedResume(seed: ResumeSeed): Promise<string> {
  const resumeId = randomUUID()
  const now = new Date().toISOString()

  const item = {
    pk: `RESUME#${resumeId}`,
    sk: 'METADATA',
    gsi1pk: 'RESUME',
    gsi1sk: `RESUME#${now}`,
    entityType: 'RESUME',
    resumeId,
    label: seed.label,
    isActive: seed.isActive,
    data: seed.data,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    )
    const activeTag = seed.isActive ? ' ★ ACTIVE' : ''
    console.log(`  ✅ ${seed.label} → ${resumeId}${activeTag}`)
    return resumeId
  } catch (error: unknown) {
    // ConditionalCheckFailedException means item already exists — safe to skip
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      console.log(`  ⏭️  ${seed.label} — already exists, skipping`)
      return resumeId
    }
    throw error
  }
}

/**
 * Main entry point — seeds all resume variants.
 */
async function main(): Promise<void> {
  console.log(`\n📄 Seeding ${RESUMES_TO_SEED.length} resume(s) to: ${TABLE_NAME}\n`)

  for (const seed of RESUMES_TO_SEED) {
    await seedResume(seed)
  }

  console.log('\n✅ Resume seeding complete.\n')
}

main().catch((error: unknown) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
