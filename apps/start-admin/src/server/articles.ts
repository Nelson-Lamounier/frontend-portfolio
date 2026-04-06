/**
 * @format
 * Article management server functions for the admin dashboard.
 *
 * Provides CRUD operations for blog articles stored in DynamoDB,
 * all protected by JWT authentication via `requireAuth()`.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'
import { fetchArticleContent, putArticleContent } from '@/lib/articles/s3-content'
import { requireAuth } from './auth-guard'

// =============================================================================
// Constants
// =============================================================================

const REGION = process.env.AWS_REGION || 'eu-west-1'
const TABLE_NAME = process.env.ARTICLES_TABLE_NAME || ''
const GSI1_NAME = process.env.DYNAMODB_GSI1_NAME || 'gsi1-status-date'

// =============================================================================
// DynamoDB Client (Lazy Singleton)
// =============================================================================

let _docClient: DynamoDBDocumentClient | null = null

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const ddbClient = new DynamoDBClient({ region: REGION })
    _docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: { removeUndefinedValues: true },
    })
  }
  return _docClient
}

// =============================================================================
// Input Schemas
// =============================================================================

const getArticlesSchema = z
  .object({ status: z.enum(['all', 'draft', 'published']).default('all') })
  .default({ status: 'all' })

const slugSchema = z.string().min(1, 'Article slug is required')

const saveContentSchema = z.object({
  id: z.string().min(1, 'Article slug is required'),
  content: z.string(),
})

const saveMetadataSchema = z.object({
  slug: z.string().min(1),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().optional(),
  seo: z
    .object({
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
})

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Lists articles, optionally filtered by publication status.
 *
 * @param data.status - `'all'` | `'draft'` | `'published'`
 * @returns Array of article summaries
 */
export const getArticlesFn = createServerFn({ method: 'GET' })
  .inputValidator(getArticlesSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    if (data.status === 'all') {
      const result = await getDocClient().send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI1_NAME,
          KeyConditionExpression: 'gsi1pk = :gsi1pk',
          ExpressionAttributeValues: { ':gsi1pk': 'STATUS#draft' },
          ScanIndexForward: false,
        }),
      )
      
      const publishedResult = await getDocClient().send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI1_NAME,
          KeyConditionExpression: 'gsi1pk = :gsi1pk',
          ExpressionAttributeValues: { ':gsi1pk': 'STATUS#published' },
          ScanIndexForward: false,
        }),
      )
      
      const reviewResult = await getDocClient().send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI1_NAME,
          KeyConditionExpression: 'gsi1pk = :gsi1pk',
          ExpressionAttributeValues: { ':gsi1pk': 'STATUS#review' },
          ScanIndexForward: false,
        }),
      )

      const allItems = [
        ...(result.Items ?? []),
        ...(reviewResult.Items ?? []),
        ...(publishedResult.Items ?? [])
      ]

      return mergeArticleItems(allItems)
    }

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: { ':gsi1pk': `STATUS#${data.status}` },
      ScanIndexForward: false,
    })

    const result = await getDocClient().send(command)
    return mergeArticleItems(result.Items ?? [])
  })

function mergeArticleItems(items: Record<string, any>[]): Record<string, any>[] {
  const mergedMap = new Map<string, any>()
  for (const item of items) {
    if (!item.pk) continue
    
    if (!item.status && typeof item.gsi1pk === 'string' && item.gsi1pk.startsWith('STATUS#')) {
      item.status = item.gsi1pk.replace('STATUS#', '')
    }

    const existing = mergedMap.get(item.pk)
    if (!existing) {
      mergedMap.set(item.pk, { ...item })
    } else {
      const merged = { ...existing }
      for (const key of Object.keys(item)) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
          merged[key] = item[key]
        } else if (existing[key] === undefined) {
           merged[key] = item[key]
        }
      }
      merged.sk = 'METADATA'
      mergedMap.set(item.pk, merged)
    }
  }
  return Array.from(mergedMap.values())
}

/**
 * Retrieves full article metadata from DynamoDB and the MDX body from S3.
 *
 * The DynamoDB METADATA record holds the `contentRef` pointer (e.g.
 * `s3://bucket/published/slug.mdx`) which is used to fetch the actual
 * content from S3 via the shared `fetchArticleContent` helper.
 *
 * @param data - The article slug
 * @returns Article metadata + content, or null if not found
 */
export const getArticleContentFn = createServerFn({ method: 'GET' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    // Step 1: Fetch the METADATA record from DynamoDB
    const metadataResult = await getDocClient().send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ARTICLE#${slug}`, sk: 'METADATA' },
      }),
    )

    const metadata = metadataResult.Item
    if (!metadata) return null

    // Step 2: Use contentRef to fetch the actual MDX body from S3
    const contentRef = metadata.contentRef as string | undefined
    let content = ''

    if (contentRef) {
      const s3Content = await fetchArticleContent(contentRef)
      content = s3Content?.content ?? ''
    }

    return {
      slug,
      title: (metadata.title as string) ?? slug,
      description: (metadata.description as string) ?? '',
      status: (metadata.status as string) ?? 'draft',
      author: (metadata.author as string) ?? 'Nelson Lamounier',
      date: (metadata.date as string) ?? '',
      contentRef: contentRef ?? '',
      content,
    }
  })

/**
 * Publishes a draft article by setting its status to `'published'`.
 *
 * @param data - The article slug
 * @returns Success indicator
 */
export const publishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    const now = new Date().toISOString()
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ARTICLE#${slug}`, sk: 'METADATA' },
      UpdateExpression: 'SET #st = :status, publishedAt = :now, updatedAt = :now, gsi1pk = :gsi1pk',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':status': 'published',
        ':now': now,
        ':gsi1pk': 'STATUS#published',
      },
    })

    await getDocClient().send(command)
    return { success: true }
  })

/**
 * Unpublishes a published article, reverting it to draft status.
 *
 * @param data - The article slug
 * @returns Success indicator
 */
export const unpublishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ARTICLE#${slug}`, sk: 'METADATA' },
      UpdateExpression: 'SET #st = :status, updatedAt = :now, gsi1pk = :gsi1pk',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':status': 'draft',
        ':now': new Date().toISOString(),
        ':gsi1pk': 'STATUS#draft',
      },
    })

    await getDocClient().send(command)
    return { success: true }
  })

/**
 * Permanently deletes an article and its content.
 *
 * @param data - The article slug
 * @returns Success indicator
 */
export const deleteArticleFn = createServerFn({ method: 'POST' })
  .inputValidator(slugSchema)
  .handler(async ({ data: slug }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    // Delete both metadata and content records
    await Promise.all([
      getDocClient().send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: `ARTICLE#${slug}`, sk: 'METADATA' },
        }),
      ),
      getDocClient().send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: `ARTICLE#${slug}`, sk: `CONTENT#${slug}` },
        }),
      ),
    ])

    return { success: true }
  })

/**
 * Saves article markdown content to S3.
 *
 * Reads the METADATA record to resolve the `contentRef` pointer,
 * then writes the updated MDX body to the S3 location.
 *
 * @param data.id - The article slug
 * @param data.content - Markdown content body
 * @returns Success indicator
 */
export const saveArticleContentFn = createServerFn({ method: 'POST' })
  .inputValidator(saveContentSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    // Look up the contentRef from the METADATA record
    const metadataResult = await getDocClient().send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ARTICLE#${data.id}`, sk: 'METADATA' },
      }),
    )

    const contentRef = metadataResult.Item?.contentRef as string | undefined
    if (!contentRef) {
      throw new Error(`Article "${data.id}" has no contentRef — cannot save content`)
    }

    // Write the updated content to S3
    await putArticleContent(contentRef, data.content)

    // Update the METADATA timestamp so lists reflect the edit
    await getDocClient().send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ARTICLE#${data.id}`, sk: 'METADATA' },
        UpdateExpression: 'SET updatedAt = :now',
        ExpressionAttributeValues: { ':now': new Date().toISOString() },
      }),
    )

    return { success: true }
  })

/**
 * Updates article metadata (title, excerpt, tags, SEO fields, etc.).
 *
 * @param data - Object containing `slug` and any updatable metadata fields
 * @returns Success indicator
 */
export const saveArticleMetadataFn = createServerFn({ method: 'POST' })
  .inputValidator(saveMetadataSchema)
  .handler(async ({ data }) => {
    await requireAuth()

    if (!TABLE_NAME) throw new Error('ARTICLES_TABLE_NAME must be set')

    const { slug, ...updates } = data
    const now = new Date().toISOString()

    const updateParts: string[] = ['updatedAt = :now']
    const expressionValues: Record<string, unknown> = { ':now': now }
    const expressionNames: Record<string, string> = {}

    let i = 0
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'status') {
          updateParts.push(`gsi1pk = :gsi1pk`)
          expressionValues[':gsi1pk'] = `STATUS#${value}`
        }

        const attrName = `#k${i}`
        const attrValue = `:v${i}`
        expressionNames[attrName] = key
        expressionValues[attrValue] = value
        updateParts.push(`${attrName} = ${attrValue}`)
        i++
      }
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ARTICLE#${slug}`, sk: 'METADATA' },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ...(Object.keys(expressionNames).length > 0 && {
        ExpressionAttributeNames: expressionNames,
      }),
    })

    await getDocClient().send(command)
    return { success: true }
  })
