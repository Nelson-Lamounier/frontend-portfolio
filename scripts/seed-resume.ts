/**
 * One-off seed script: Migrate all hardcoded resume variants into DynamoDB.
 *
 * Seeds three role-tailored resume versions:
 *   1. DevOps Engineer (resume-data.ts) — set as active
 *   2. ESC Systems Engineer (resume-data-esc.ts)
 *   3. Full Stack Developer (resume-data-fullstack.ts)
 *
 * Each label is derived from the profile.title in the respective data file,
 * making labels dynamic per role.
 *
 * Usage:
 *   AWS_PROFILE=dev-account npx tsx scripts/seed-resume.ts
 */

import { randomUUID } from 'crypto'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'

import { resumeData } from '../src/lib/resumes/resume-data'
import { resumeDataEsc } from '../src/lib/resumes/resume-data-esc'
import { resumeDataFullstack } from '../src/lib/resumes/resume-data-fullstack'
import type { ResumeData } from '../src/lib/resumes/resume-data'

// ─── Configuration ──────────────────────────────────────────────────────────
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'bedrock-dev-ai-content'
const REGION = process.env.AWS_REGION || 'eu-west-1'

// ─── DynamoDB Client ────────────────────────────────────────────────────────
const client = new DynamoDBClient({ region: REGION })
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

interface ResumeVariant {
  label: string
  data: ResumeData
  setActive: boolean
}

/**
 * Creates a single resume item in DynamoDB.
 *
 * @param variant - Resume variant to seed
 * @returns The created resume ID
 */
async function createResumeItem(variant: ResumeVariant): Promise<string> {
  const resumeId = randomUUID()
  const now = new Date().toISOString()

  const entity = {
    pk: `RESUME#${resumeId}`,
    sk: 'METADATA',
    gsi1pk: 'RESUME',
    gsi1sk: `RESUME#${now}`,
    entityType: 'RESUME',
    resumeId,
    label: variant.label,
    isActive: false,
    data: variant.data,
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

  if (variant.setActive) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `RESUME#${resumeId}`, sk: 'METADATA' },
        UpdateExpression: 'SET isActive = :active, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':active': true,
          ':updatedAt': new Date().toISOString(),
        },
        ConditionExpression: 'attribute_exists(pk)',
      }),
    )
  }

  return resumeId
}

/**
 * Checks if any RESUME items already exist in the table.
 *
 * @returns true if resume items already exist
 */
async function resumesExist(): Promise<boolean> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: { ':type': 'RESUME' },
      Limit: 1,
      ProjectionExpression: 'pk',
    }),
  )
  return (result.Items?.length ?? 0) > 0
}

/**
 * Seeds all three resume variants into DynamoDB.
 */
async function seedResumes(): Promise<void> {
  console.log('\n📄 Resume Seed Script')
  console.log(`   Table:  ${TABLE_NAME}`)
  console.log(`   Region: ${REGION}`)

  // Safety check — don't seed twice
  const existing = await resumesExist()
  if (existing) {
    console.log('\n⚠️  Resume items already exist in the table. Skipping seed.')
    console.log('   To re-seed, delete existing RESUME items first.\n')
    return
  }

  const variants: ResumeVariant[] = [
    {
      label: resumeData.profile.title,
      data: resumeData,
      setActive: true, // DevOps = default active
    },
    {
      label: resumeDataEsc.profile.title,
      data: resumeDataEsc,
      setActive: false,
    },
    {
      label: resumeDataFullstack.profile.title,
      data: resumeDataFullstack,
      setActive: false,
    },
  ]

  console.log(`\n   Seeding ${variants.length} resume versions…\n`)

  const results: Array<{ label: string; id: string; active: boolean }> = []

  for (const variant of variants) {
    const id = await createResumeItem(variant)
    results.push({ label: variant.label, id, active: variant.setActive })
    console.log(
      `   ✅ ${variant.setActive ? '🟢' : '  '} ${variant.label}`,
    )
    console.log(`      ID: ${id}`)
    // Small delay to ensure unique timestamps in gsi1sk
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log('\n── Summary ──────────────────────────────────')
  for (const r of results) {
    console.log(
      `   ${r.active ? '🟢 ACTIVE' : '   DRAFT '} ${r.id} — ${r.label}`,
    )
  }
  console.log('─────────────────────────────────────────────\n')
}

seedResumes().catch((err) => {
  console.error('❌ Failed to seed resumes:', err)
  process.exit(1)
})
