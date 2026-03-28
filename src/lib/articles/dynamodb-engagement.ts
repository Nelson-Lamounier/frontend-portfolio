/**
 * DynamoDB Engagement Data Layer (Server-Side Only)
 *
 * Handles article likes, comments, and engagement counters.
 * All entities share pk=ARTICLE#<slug> to co-locate with article metadata.
 *
 * Entities:
 *   COUNTERS  — atomic like/comment counts
 *   LIKE#<id> — one per browser session per article
 *   COMMENT#<ts>#<id> — comment with moderation status
 *
 * This module should NEVER be imported from client components.
 *
 * Environment Variables:
 *   DYNAMODB_TABLE_NAME — required
 *   AWS_REGION          — supplied by ECS task metadata
 */

import { randomUUID } from 'crypto'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'

// ========================================
// Types
// ========================================

/** Comment moderation status */
export type CommentStatus = 'pending' | 'approved' | 'rejected'

/** Comment entity as stored in DynamoDB */
export interface CommentEntity {
  /** Partition key: ARTICLE#<slug> */
  pk: string
  /** Sort key: COMMENT#<timestamp>#<uuid> */
  sk: string
  /** Entity type discriminator */
  entityType: 'COMMENT'
  /** Unique comment identifier */
  commentId: string
  /** Article slug (denormalised for admin queries) */
  articleSlug: string
  /** Commenter display name */
  name: string
  /** Commenter email (never exposed publicly) */
  email: string
  /** Comment text */
  body: string
  /** Moderation status */
  status: CommentStatus
  /** Commenter IP address (never exposed publicly) */
  ipAddress: string
  /** GSI1 keys for admin moderation queue */
  gsi1pk: string
  /** GSI1 sort key: <timestamp> for chronological order */
  gsi1sk: string
  /** ISO-8601 timestamp */
  createdAt: string
}

/** Public-safe comment (no email/IP) */
export interface PublicComment {
  /** Unique comment identifier */
  commentId: string
  /** Commenter display name */
  name: string
  /** Comment text */
  body: string
  /** ISO-8601 timestamp */
  createdAt: string
}

/** Admin comment view (includes email, article slug) */
export interface AdminComment extends PublicComment {
  /** Article slug */
  articleSlug: string
  /** Commenter email */
  email: string
  /** Moderation status */
  status: CommentStatus
}

/** Like/comment counters */
export interface EngagementCounters {
  /** Total like count */
  likeCount: number
  /** Total approved comment count */
  commentCount: number
}

/** Like status for a session */
export interface LikeStatus {
  /** Whether this session has liked the article */
  liked: boolean
  /** Total like count */
  likeCount: number
}

// ========================================
// Configuration
// ========================================

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || ''
const GSI1_NAME = process.env.DYNAMODB_GSI1_NAME || 'gsi1-status-date'
const REGION = process.env.AWS_REGION || 'eu-west-1'

/** Maximum comments per IP per hour */
const RATE_LIMIT_MAX = 5
/** Rate limit window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
/** Maximum comment body length */
const MAX_COMMENT_LENGTH = 2000

/**
 * Check if DynamoDB is configured for engagement operations.
 */
export function isEngagementDBConfigured(): boolean {
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
// Likes
// ========================================

/**
 * Toggle a like for an article from a browser session.
 *
 * If the session hasn't liked the article, adds a like and increments the counter.
 * If already liked, removes the like and decrements the counter.
 *
 * @param slug - Article URL slug
 * @param sessionId - Browser session UUID (from localStorage)
 * @returns Updated like status
 */
export async function toggleLike(
  slug: string,
  sessionId: string,
): Promise<LikeStatus> {
  const docClient = getDocClient()
  const pk = `ARTICLE#${slug}`
  const sk = `LIKE#${sessionId}`

  // Check if already liked
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
      ProjectionExpression: 'pk',
    }),
  )

  if (existing.Item) {
    // Unlike: remove like and decrement counter
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
      }),
    )

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: 'COUNTERS' },
        UpdateExpression: 'ADD likeCount :dec',
        ExpressionAttributeValues: { ':dec': -1 },
      }),
    )

    const counters = await getCounters(slug)
    return { liked: false, likeCount: Math.max(0, counters.likeCount) }
  }

  // Like: add like and increment counter
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk,
        entityType: 'LIKE',
        sessionId,
        createdAt: new Date().toISOString(),
      },
    }),
  )

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: 'COUNTERS' },
      UpdateExpression: 'ADD likeCount :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }),
  )

  const counters = await getCounters(slug)
  return { liked: true, likeCount: counters.likeCount }
}

/**
 * Check if a session has liked an article and get the total count.
 *
 * @param slug - Article URL slug
 * @param sessionId - Browser session UUID
 * @returns Like status for the session
 */
export async function getLikeStatus(
  slug: string,
  sessionId: string,
): Promise<LikeStatus> {
  const docClient = getDocClient()

  const [likeResult, counters] = await Promise.all([
    docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ARTICLE#${slug}`, sk: `LIKE#${sessionId}` },
        ProjectionExpression: 'pk',
      }),
    ),
    getCounters(slug),
  ])

  return {
    liked: !!likeResult.Item,
    likeCount: counters.likeCount,
  }
}

// ========================================
// Counters
// ========================================

/**
 * Fetch engagement counters for an article.
 *
 * @param slug - Article URL slug
 * @returns Like and comment counts (defaults to 0)
 */
export async function getCounters(slug: string): Promise<EngagementCounters> {
  const docClient = getDocClient()

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ARTICLE#${slug}`, sk: 'COUNTERS' },
      ProjectionExpression: 'likeCount, commentCount',
    }),
  )

  return {
    likeCount: Math.max(0, (result.Item?.likeCount as number) ?? 0),
    commentCount: Math.max(0, (result.Item?.commentCount as number) ?? 0),
  }
}

// ========================================
// Comments
// ========================================

/**
 * Submit a new comment (pending moderation).
 *
 * Validates input, checks rate limit, then creates the comment
 * entity with `status: 'pending'`.
 *
 * @param slug - Article URL slug
 * @param name - Commenter display name
 * @param email - Commenter email
 * @param body - Comment text (max 2000 chars)
 * @param ipAddress - Commenter IP for rate limiting
 * @returns Created comment (public-safe)
 * @throws Error if validation fails or rate limited
 */
export async function createComment(
  slug: string,
  name: string,
  email: string,
  body: string,
  ipAddress: string,
): Promise<PublicComment> {
  // Validate inputs
  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedBody = body.trim()

  if (!trimmedName || trimmedName.length > 100) {
    throw new Error('Name is required (max 100 characters)')
  }

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('A valid email address is required')
  }

  if (!trimmedBody || trimmedBody.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment is required (max ${MAX_COMMENT_LENGTH} characters)`)
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(ipAddress)
  if (!withinLimit) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }

  const docClient = getDocClient()
  const commentId = randomUUID()
  const now = new Date().toISOString()

  const entity: CommentEntity = {
    pk: `ARTICLE#${slug}`,
    sk: `COMMENT#${now}#${commentId}`,
    entityType: 'COMMENT',
    commentId,
    articleSlug: slug,
    name: trimmedName,
    email: trimmedEmail,
    body: trimmedBody,
    status: 'pending',
    ipAddress,
    gsi1pk: 'COMMENT#pending',
    gsi1sk: now,
    createdAt: now,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: entity,
    }),
  )

  return {
    commentId,
    name: trimmedName,
    body: trimmedBody,
    createdAt: now,
  }
}

/**
 * Fetch approved comments for an article (public-facing).
 *
 * @param slug - Article URL slug
 * @returns Array of approved comments (no email/IP)
 */
export async function getApprovedComments(slug: string): Promise<PublicComment[]> {
  const docClient = getDocClient()

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      FilterExpression: '#status = :approved',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `ARTICLE#${slug}`,
        ':prefix': 'COMMENT#',
        ':approved': 'approved',
      },
      ScanIndexForward: true, // oldest first
    }),
  )

  if (!result.Items || result.Items.length === 0) return []

  return result.Items.map((item) => ({
    commentId: item.commentId as string,
    name: item.name as string,
    body: item.body as string,
    createdAt: item.createdAt as string,
  }))
}

/**
 * Fetch pending comments across all articles (admin moderation queue).
 *
 * Uses GSI1 with pk=COMMENT#pending for efficient querying.
 *
 * @returns Array of pending comments with admin details
 */
export async function getPendingComments(): Promise<AdminComment[]> {
  const docClient = getDocClient()

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: {
          ':pk': 'COMMENT#pending',
        },
        ScanIndexForward: false, // newest first
      }),
    )

    if (!result.Items || result.Items.length === 0) return []

    return result.Items.map((item) => ({
      commentId: item.commentId as string,
      articleSlug: item.articleSlug as string,
      name: item.name as string,
      email: item.email as string,
      body: item.body as string,
      status: item.status as CommentStatus,
      createdAt: item.createdAt as string,
    }))
  } catch {
    console.warn('[dynamodb-engagement] GSI1 unavailable for pending comments')
    return []
  }
}

/**
 * Approve or reject a comment.
 *
 * When approved, increments the article's commentCount counter.
 * When rejected, does not affect the counter.
 *
 * @param slug - Article URL slug
 * @param commentSk - Full sort key of the comment
 * @param action - 'approve' or 'reject'
 * @returns Updated comment (admin view)
 * @throws Error if comment not found
 */
export async function moderateComment(
  slug: string,
  commentSk: string,
  action: 'approve' | 'reject',
): Promise<AdminComment> {
  const docClient = getDocClient()
  const newStatus: CommentStatus = action === 'approve' ? 'approved' : 'rejected'

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `ARTICLE#${slug}`,
        sk: commentSk,
      },
      UpdateExpression: 'SET #status = :status, gsi1pk = :gsi1pk',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': newStatus,
        ':gsi1pk': `COMMENT#${newStatus}`,
      },
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    }),
  )

  if (!result.Attributes) {
    throw new Error('Comment not found')
  }

  // Increment comment counter on approval
  if (action === 'approve') {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ARTICLE#${slug}`, sk: 'COUNTERS' },
        UpdateExpression: 'ADD commentCount :inc',
        ExpressionAttributeValues: { ':inc': 1 },
      }),
    )
  }

  const item = result.Attributes
  return {
    commentId: item.commentId as string,
    articleSlug: item.articleSlug as string,
    name: item.name as string,
    email: item.email as string,
    body: item.body as string,
    status: item.status as CommentStatus,
    createdAt: item.createdAt as string,
  }
}

/**
 * Permanently delete a comment.
 *
 * If the comment was approved, decrements the commentCount counter.
 *
 * @param slug - Article URL slug
 * @param commentSk - Full sort key of the comment
 * @throws Error if comment not found
 */
export async function deleteComment(
  slug: string,
  commentSk: string,
): Promise<void> {
  const docClient = getDocClient()

  // Check current status to adjust counter
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ARTICLE#${slug}`, sk: commentSk },
      ProjectionExpression: '#status',
      ExpressionAttributeNames: { '#status': 'status' },
    }),
  )

  if (!existing.Item) {
    throw new Error('Comment not found')
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ARTICLE#${slug}`, sk: commentSk },
    }),
  )

  // Decrement counter if it was an approved comment
  if (existing.Item.status === 'approved') {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ARTICLE#${slug}`, sk: 'COUNTERS' },
        UpdateExpression: 'ADD commentCount :dec',
        ExpressionAttributeValues: { ':dec': -1 },
      }),
    )
  }
}

// ========================================
// Rate Limiting
// ========================================

/**
 * Check if an IP address is within the comment rate limit.
 *
 * Queries recent comments (last hour) from this IP across all articles.
 * Uses a Scan with filter — acceptable for a portfolio with low traffic.
 *
 * @param ipAddress - Commenter IP address
 * @returns true if within limit, false if rate limited
 */
async function checkRateLimit(ipAddress: string): Promise<boolean> {
  const docClient = getDocClient()
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk > :windowStart',
      FilterExpression: 'ipAddress = :ip',
      ExpressionAttributeValues: {
        ':pk': 'COMMENT#pending',
        ':windowStart': windowStart,
        ':ip': ipAddress,
      },
      Select: 'COUNT',
    }),
  )

  return (result.Count ?? 0) < RATE_LIMIT_MAX
}
