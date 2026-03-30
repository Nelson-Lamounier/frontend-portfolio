/**
 * Strategist Application Detail API
 *
 * GET /api/admin/strategist/applications/[slug]
 *
 * Retrieves the full application detail by querying all sort key
 * patterns under `pk = APPLICATION#<slug>`: METADATA, ANALYSIS#*,
 * and INTERVIEW#* records.
 *
 * Env vars:
 *   - STRATEGIST_TABLE_NAME: DynamoDB table name
 *   - AWS_REGION: AWS region (default: eu-west-1)
 *
 * Guarded: requires an active NextAuth.js admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { auth } from '@/lib/auth'
import type { ApplicationDetail, AnalysisMetadata, ResumeSuggestions } from '@/lib/types/strategist.types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION || 'eu-west-1'

/** DynamoDB table name */
const TABLE_NAME = process.env.STRATEGIST_TABLE_NAME || ''

// ---------------------------------------------------------------------------
// Singleton AWS client
// ---------------------------------------------------------------------------

let _docClient: DynamoDBDocumentClient | null = null

/**
 * Returns a shared DynamoDB Document client instance.
 *
 * @returns DynamoDBDocumentClient singleton
 */
function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const ddbClient = new DynamoDBClient({ region: REGION })
    _docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    })
  }
  return _docClient
}

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

/** Next.js dynamic route params */
interface RouteParams {
  params: Promise<{ slug: string }>
}

// ---------------------------------------------------------------------------
// DynamoDB record type
// ---------------------------------------------------------------------------

/** Generic DynamoDB item record */
type DynamoRecord = Record<string, unknown>

// ---------------------------------------------------------------------------
// Partitioned query result
// ---------------------------------------------------------------------------

/** Partitioned DynamoDB records by sort key prefix */
interface PartitionedRecords {
  readonly metadata: DynamoRecord | null
  readonly analysis: DynamoRecord | null
  readonly interview: DynamoRecord | null
}

/**
 * Partitions DynamoDB items by their sort key prefix.
 * For ANALYSIS and INTERVIEW records, selects the latest by createdAt.
 *
 * @param items - Raw DynamoDB items
 * @returns Partitioned records
 */
function partitionItems(items: DynamoRecord[]): PartitionedRecords {
  let metadata: DynamoRecord | null = null
  let analysis: DynamoRecord | null = null
  let interview: DynamoRecord | null = null

  for (const item of items) {
    const sk = String(item['sk'] ?? '')
    if (sk === 'METADATA') {
      metadata = item
    } else if (sk.startsWith('ANALYSIS#')) {
      analysis = selectLatest(analysis, item)
    } else if (sk.startsWith('INTERVIEW#')) {
      interview = selectLatest(interview, item)
    }
  }

  return { metadata, analysis, interview }
}

/**
 * Selects the record with the latest createdAt timestamp.
 *
 * @param current - Current latest record (may be null)
 * @param candidate - Candidate record to compare
 * @returns The record with the later timestamp
 */
function selectLatest(
  current: DynamoRecord | null,
  candidate: DynamoRecord,
): DynamoRecord {
  if (!current) return candidate
  const currentTs = String(current['createdAt'] ?? '')
  const candidateTs = String(candidate['createdAt'] ?? '')
  return candidateTs > currentTs ? candidate : current
}

/**
 * Assembles the ApplicationDetail response from partitioned records.
 *
 * @param slug - Application slug
 * @param metadata - METADATA record
 * @param analysisRecord - Latest ANALYSIS record (may be null)
 * @param interviewRecord - Latest INTERVIEW record (may be null)
 * @returns Assembled ApplicationDetail
 */
function assembleDetail(
  slug: string,
  metadata: DynamoRecord,
  analysisRecord: DynamoRecord | null,
  interviewRecord: DynamoRecord | null,
): ApplicationDetail {
  return {
    slug,
    targetCompany: String(metadata['targetCompany'] ?? ''),
    targetRole: String(metadata['targetRole'] ?? ''),
    status: String(metadata['status'] ?? 'analysing') as ApplicationDetail['status'],
    interviewStage: String(metadata['interviewStage'] ?? 'applied') as ApplicationDetail['interviewStage'],
    createdAt: String(metadata['createdAt'] ?? ''),
    updatedAt: String(metadata['updatedAt'] ?? ''),
    context: {
      pipelineId: String(metadata['pipelineId'] ?? ''),
      cumulativeInputTokens: Number(metadata['cumulativeInputTokens'] ?? 0),
      cumulativeOutputTokens: Number(metadata['cumulativeOutputTokens'] ?? 0),
      cumulativeThinkingTokens: Number(metadata['cumulativeThinkingTokens'] ?? 0),
      cumulativeCostUsd: Number(metadata['cumulativeCostUsd'] ?? 0),
    },
    research: (analysisRecord?.['research'] ?? null) as ApplicationDetail['research'],
    analysis: analysisRecord
      ? {
          analysisXml: String(analysisRecord['analysisXml'] ?? ''),
          coverLetter: String(analysisRecord['coverLetter'] ?? ''),
          metadata: (analysisRecord['analysisMetadata'] ?? {
            overallFitRating: 'STRETCH' as const,
            applicationRecommendation: 'APPLY_WITH_CAVEATS' as const,
          }) as AnalysisMetadata,
          resumeSuggestions: (analysisRecord['resumeSuggestions'] ?? {
            additions: 0,
            reframes: 0,
            eslCorrections: 0,
            summary: '',
          }) as ResumeSuggestions,
        }
      : null,
    interviewPrep: (interviewRecord?.['coaching'] ?? null) as ApplicationDetail['interviewPrep'],
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/strategist/applications/[slug]
 *
 * Queries all records for a given application slug and assembles
 * the full ApplicationDetail response.
 *
 * @param _request - Incoming request (unused, params in route)
 * @param context - Route context with slug param
 * @returns Full ApplicationDetail JSON
 */
export async function GET(
  _request: NextRequest,
  context: RouteParams,
): Promise<NextResponse<ApplicationDetail | { error: string }>> {
  // Guard: authenticated admin session required
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorised — admin session required' },
      { status: 401 },
    )
  }

  if (!TABLE_NAME) {
    console.error('[strategist-detail] Missing STRATEGIST_TABLE_NAME env var')
    return NextResponse.json(
      { error: 'Server misconfiguration: STRATEGIST_TABLE_NAME must be set' },
      { status: 500 },
    )
  }

  const { slug } = await context.params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { error: 'Missing slug parameter' },
      { status: 400 },
    )
  }

  try {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `APPLICATION#${slug}`,
      },
    })

    const result = await getDocClient().send(command)
    const items = result.Items ?? []

    if (items.length === 0) {
      return NextResponse.json(
        { error: `Application not found: ${slug}` },
        { status: 404 },
      )
    }

    const { metadata, analysis, interview } = partitionItems(items)

    if (!metadata) {
      return NextResponse.json(
        { error: `Metadata record not found for: ${slug}` },
        { status: 404 },
      )
    }

    const detail = assembleDetail(slug, metadata, analysis, interview)
    return NextResponse.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[strategist-detail] ❌ Failed for "${slug}":`, message)
    return NextResponse.json(
      { error: `Failed to fetch application: ${message}` },
      { status: 500 },
    )
  }
}

