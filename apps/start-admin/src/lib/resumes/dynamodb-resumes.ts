/**
 * DynamoDB Resumes Data Layer (Server-Side Only)
 *
 * CRUD operations for resume versions stored in DynamoDB.
 * Uses RESUME#<id> partition keys within the applications table.
 *
 * **Migration note (2026-03):** Resume entities were moved from the
 * articles table (DYNAMODB_TABLE_NAME) to the applications table
 * (STRATEGIST_TABLE_NAME) for domain separation. The pipeline agents
 * query the applications table directly for the most up-to-date resume
 * at invocation time, avoiding Knowledge Base sync delays.
 *
 * Each resume stores the full ResumeData JSON (~10–15 KB),
 * well within DynamoDB's 400 KB item limit.
 *
 * Only one resume can be active (publicly displayed) at a time.
 *
 * This module should NEVER be imported from client components.
 *
 * Environment Variables:
 *   STRATEGIST_TABLE_NAME – primary table (applications domain)
 *   DYNAMODB_TABLE_NAME   – fallback (legacy, pre-migration)
 *   DYNAMODB_GSI1_NAME    – default: gsi1-status-date
 *   AWS_REGION            – supplied by ECS task metadata
 */

import { randomUUID } from 'node:crypto'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'

import type { ResumeData } from './resume-data'

// ========================================
// Types
// ========================================

/** Resume entity as stored in DynamoDB */
export interface ResumeEntity {
  /** Partition key: RESUME#<uuid> */
  pk: string
  /** Sort key: always METADATA */
  sk: string
  /** GSI1 partition key: RESUME (for listing all resumes) */
  gsi1pk: string
  /** GSI1 sort key: RESUME#<createdAt> (chronological order) */
  gsi1sk: string
  /** Entity type discriminator */
  entityType: 'RESUME'
  /** Unique resume identifier */
  resumeId: string
  /** Human-friendly label (e.g. "DevOps Engineer") */
  label: string
  /** Whether this resume is publicly displayed */
  isActive: boolean
  /** Full resume content */
  data: ResumeData
  /** ISO-8601 timestamp */
  createdAt: string
  /** ISO-8601 timestamp */
  updatedAt: string
}

/** Resume summary returned to the client (without DynamoDB keys) */
export interface ResumeSummary {
  /** Unique resume identifier */
  resumeId: string
  /** Human-friendly label */
  label: string
  /** Whether this resume is publicly displayed */
  isActive: boolean
  /** ISO-8601 timestamp */
  createdAt: string
  /** ISO-8601 timestamp */
  updatedAt: string
}

/** Full resume with content */
export interface ResumeWithData extends ResumeSummary {
  /** Full resume content */
  data: ResumeData
}

// ========================================
// Configuration
// ========================================

/**
 * Table name resolution: prefer the applications table, fall back to
 * the legacy articles table for environments that haven't migrated yet.
 */
const TABLE_NAME =
  process.env.STRATEGIST_TABLE_NAME || process.env.DYNAMODB_TABLE_NAME || ''
const GSI1_NAME = process.env.DYNAMODB_GSI1_NAME || 'gsi1-status-date'
const REGION = process.env.AWS_REGION || 'eu-west-1'

/**
 * Check if DynamoDB is configured for resume operations.
 * Returns true when either STRATEGIST_TABLE_NAME or DYNAMODB_TABLE_NAME is set.
 */
export function isResumeDBConfigured(): boolean {
  return !!TABLE_NAME
}

// ========================================
// DynamoDB Client (singleton, lazy init)
// ========================================

let _docClient: DynamoDBDocumentClient | null = null

/**
 * Lazily initialises and returns the DynamoDB Document Client.
 *
 * @returns Singleton DynamoDBDocumentClient instance
 */
function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const client = new DynamoDBClient({ region: REGION })
    _docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    })
  }
  return _docClient
}

// ========================================
// Cache (lightweight in-memory TTL)
// ========================================

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const CACHE_TTL_MS = 60_000 // 1 minute — resumes change infrequently
const cacheStore = new Map<string, CacheEntry<unknown>>()

/**
 * Retrieves a cached value if it exists and hasn't expired.
 *
 * @param key - Cache key
 * @returns Cached value or null
 */
function cacheGet<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return null
  }
  return entry.data as T
}

/**
 * Stores a value in the cache with TTL.
 *
 * @param key - Cache key
 * @param data - Value to cache
 * @param ttlMs - Time-to-live in milliseconds
 */
function cacheSet<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs })
}

/**
 * Invalidates all resume-related cache entries.
 */
function cacheInvalidate(): void {
  for (const key of Array.from(cacheStore.keys())) {
    if (key.startsWith('resume:')) {
      cacheStore.delete(key)
    }
  }
}

// ========================================
// Helpers
// ========================================

/**
 * Converts a DynamoDB entity to a client-facing ResumeSummary.
 *
 * @param entity - Raw DynamoDB item
 * @returns Resume summary without DynamoDB keys
 */
function entityToSummary(entity: ResumeEntity): ResumeSummary {
  return {
    resumeId: entity.resumeId,
    label: entity.label,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

/**
 * Converts a DynamoDB entity to full ResumeWithData.
 *
 * @param entity - Raw DynamoDB item
 * @returns Resume with full content data
 */
function entityToFull(entity: ResumeEntity): ResumeWithData {
  return {
    ...entityToSummary(entity),
    data: entity.data,
  }
}

// ========================================
// CRUD Operations
// ========================================

/**
 * Create a new resume version.
 *
 * @param label - Human-friendly name (e.g. "DevOps Engineer")
 * @param data - Full ResumeData content
 * @returns Newly created resume with data
 */
export async function createResume(
  label: string,
  data: ResumeData,
): Promise<ResumeWithData> {
  const docClient = getDocClient()
  const resumeId = randomUUID()
  const now = new Date().toISOString()

  const entity: ResumeEntity = {
    pk: `RESUME#${resumeId}`,
    sk: 'METADATA',
    gsi1pk: 'RESUME',
    gsi1sk: `RESUME#${now}`,
    entityType: 'RESUME',
    resumeId,
    label,
    isActive: false,
    data,
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

  cacheInvalidate()
  return entityToFull(entity)
}

/**
 * Update an existing resume's label and/or content.
 *
 * @param resumeId - UUID of the resume to update
 * @param label - Updated label
 * @param data - Updated ResumeData content
 * @returns Updated resume with data
 * @throws Error if resume not found
 */
export async function updateResume(
  resumeId: string,
  label: string,
  data: ResumeData,
): Promise<ResumeWithData> {
  const docClient = getDocClient()
  const now = new Date().toISOString()

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `RESUME#${resumeId}`,
        sk: 'METADATA',
      },
      UpdateExpression: 'SET #label = :label, #data = :data, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#label': 'label',
        '#data': 'data',
      },
      ExpressionAttributeValues: {
        ':label': label,
        ':data': data,
        ':updatedAt': now,
      },
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    }),
  )

  if (!result.Attributes) {
    throw new Error(`Resume not found: ${resumeId}`)
  }

  cacheInvalidate()
  return entityToFull(result.Attributes as ResumeEntity)
}

/**
 * Delete a resume version.
 *
 * @param resumeId - UUID of the resume to delete
 * @throws Error if the resume is currently active
 */
export async function deleteResume(resumeId: string): Promise<void> {
  const docClient = getDocClient()

  // Prevent deleting the active resume
  const existing = await getResume(resumeId)
  if (existing?.isActive) {
    throw new Error('Cannot delete the active resume. Set another resume as active first.')
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `RESUME#${resumeId}`,
        sk: 'METADATA',
      },
      ConditionExpression: 'attribute_exists(pk)',
    }),
  )

  cacheInvalidate()
}

let warnedGSI1 = false

/**
 * List all resume versions, sorted by creation date (newest first).
 *
 * Uses GSI1 with pk=RESUME, falls back to a Scan if GSI unavailable.
 *
 * @returns Array of resume summaries
 */
export async function listResumes(): Promise<ResumeSummary[]> {
  const cacheKey = 'resume:list'
  const cached = cacheGet<ResumeSummary[]>(cacheKey)
  if (cached) return cached

  const docClient = getDocClient()

  // Try GSI1 first
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: {
          ':pk': 'RESUME',
        },
        ScanIndexForward: false,
      }),
    )

    if (result.Items && result.Items.length > 0) {
      const resumes = result.Items.map((item) =>
        entityToSummary(item as ResumeEntity),
      )
      cacheSet(cacheKey, resumes)
      return resumes
    }
  } catch {
    if (!warnedGSI1) {
      console.warn('[dynamodb-resumes] GSI1 unavailable, falling back to Scan')
      warnedGSI1 = true
    }
  }

  // Fallback: Scan filtered by entityType=RESUME
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type AND sk = :sk',
      ExpressionAttributeValues: {
        ':type': 'RESUME',
        ':sk': 'METADATA',
      },
    }),
  )

  if (!scanResult.Items || scanResult.Items.length === 0) {
    cacheSet(cacheKey, [])
    return []
  }

  const resumes = scanResult.Items
    .map((item) => entityToSummary(item as ResumeEntity))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  cacheSet(cacheKey, resumes)
  return resumes
}

/**
 * Fetch a single resume by ID with full content.
 *
 * @param resumeId - UUID of the resume
 * @returns Resume with data, or null if not found
 */
export async function getResume(resumeId: string): Promise<ResumeWithData | null> {
  const cacheKey = `resume:${resumeId}`
  const cached = cacheGet<ResumeWithData | null>(cacheKey)
  if (cached !== null && cached !== undefined) return cached

  const docClient = getDocClient()

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `RESUME#${resumeId}`,
        sk: 'METADATA',
      },
    }),
  )

  if (!result.Item) {
    // Cache the null result so we don't spam the DB
    cacheSet(cacheKey, null)
    return null
  }

  const resume = entityToFull(result.Item as ResumeEntity)
  cacheSet(cacheKey, resume)
  return resume
}

/**
 * Fetch the currently active (publicly displayed) resume.
 *
 * Scans for the item with isActive=true. Returns null if no
 * resume is active (falls back to hardcoded data upstream).
 *
 * @returns Active resume with data, or null
 */
export async function getActiveResume(): Promise<ResumeWithData | null> {
  const cacheKey = 'resume:active'
  // cacheGet technically returns T | null, but if the cached value IS null...
  // wait, our cache map stores objects. We can differentiate missing vs null, but cacheGet returns `null` for missing.
  // Actually, wait, let's just perform the DB query if it returns null, unless we change cacheGet.
  // For simplicity, we just look inside `cacheStore`.
  const entry = cacheStore.get(cacheKey)
  if (entry && Date.now() <= entry.expiresAt) {
    return entry.data as ResumeWithData | null
  }

  const docClient = getDocClient()

  // Scan for the active resume (only one should exist)
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type AND isActive = :active AND sk = :sk',
      ExpressionAttributeValues: {
        ':type': 'RESUME',
        ':active': true,
        ':sk': 'METADATA',
      },
    }),
  )

  if (!result.Items || result.Items.length === 0) {
    cacheSet(cacheKey, null, 300_000)
    return null
  }

  const resume = entityToFull(result.Items[0] as ResumeEntity)
  cacheSet(cacheKey, resume, 300_000) // 5 min cache for public reads
  return resume
}

/**
 * Set a resume as the publicly displayed version.
 *
 * Deactivates the currently active resume (if any) and activates
 * the specified one. Uses conditional writes for consistency.
 *
 * @param resumeId - UUID of the resume to activate
 * @returns The newly activated resume
 * @throws Error if resume not found
 */
export async function setActiveResume(resumeId: string): Promise<ResumeWithData> {
  const docClient = getDocClient()
  const now = new Date().toISOString()

  // 1. Find and deactivate the currently active resume
  const currentActive = await getActiveResume()
  if (currentActive && currentActive.resumeId !== resumeId) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `RESUME#${currentActive.resumeId}`,
          sk: 'METADATA',
        },
        UpdateExpression: 'SET isActive = :inactive, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':inactive': false,
          ':updatedAt': now,
        },
      }),
    )
  }

  // 2. Activate the target resume
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `RESUME#${resumeId}`,
        sk: 'METADATA',
      },
      UpdateExpression: 'SET isActive = :active, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':active': true,
        ':updatedAt': now,
      },
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    }),
  )

  if (!result.Attributes) {
    throw new Error(`Resume not found: ${resumeId}`)
  }

  cacheInvalidate()
  return entityToFull(result.Attributes as ResumeEntity)
}
