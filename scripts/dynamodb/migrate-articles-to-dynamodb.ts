#!/usr/bin/env ts-node
/**
 * Article Migration Script - MDX to DynamoDB
 *
 * This script migrates existing MDX articles from the filesystem to DynamoDB
 * and uploads associated images to S3.
 *
 * Prerequisites:
 * - AWS credentials configured (via env vars, ~/.aws/credentials, or IAM role)
 * - DynamoDB table created (see CDK stack in infrastructure repository)
 * - S3 bucket created for article assets
 *
 * Usage:
 *   npx tsx scripts/dynamodb/migrate-articles-to-dynamodb.ts
 *
 * Environment Variables:
 *   AWS_REGION          - AWS region (default: eu-west-1)
 *   DYNAMODB_TABLE_NAME - DynamoDB table name
 *   S3_BUCKET_NAME      - S3 bucket for article assets
 *   CLOUDFRONT_DOMAIN   - CloudFront domain for image URLs
 *   DRY_RUN             - Set to 'true' to preview without writing
 *   FORCE_UPDATE        - Set to 'true' to overwrite existing articles
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb'
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { lookup } from 'mime-types'

// ========================================
// Configuration
// ========================================

const CONFIG = {
  region: process.env.AWS_REGION || 'eu-west-1',
  profile: process.env.AWS_PROFILE || undefined,
  tableName: process.env.DYNAMODB_TABLE_NAME || 'nextjs-personal-portfolio-development',
  bucketName: process.env.S3_BUCKET_NAME || 'webapp-article-assets-development',
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || '',
  dryRun: process.env.DRY_RUN === 'true',
  forceUpdate: process.env.FORCE_UPDATE === 'true',
  articlesDir: join(process.cwd(), 'src', 'app', 'articles'),
}

// ========================================
// AWS Clients
// ========================================

const clientConfig = {
  region: CONFIG.region,
  ...(CONFIG.profile && {
    credentials: undefined, // Let SDK use profile from AWS_PROFILE env var
  }),
}

const dynamoClient = new DynamoDBClient(clientConfig)
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const s3Client = new S3Client(clientConfig)

// ========================================
// Types
// ========================================

interface ArticleMetadata {
  title: string
  description: string
  author: string
  date: string
}

interface ComponentData {
  componentId: string
  componentType: string
  position: number
  props: Record<string, unknown>
}

interface ImageData {
  id: string
  s3Key: string
  localPath: string
  alt: string
  width?: number
  height?: number
}

interface MigrationResult {
  slug: string
  success: boolean
  metadata?: ArticleMetadata
  imagesUploaded: number
  error?: string
}

// ========================================
// Utility Functions
// ========================================

/**
 * Extracts article metadata from MDX export statement
 */
function extractMetadata(mdxContent: string): ArticleMetadata | null {
  // Match the export const article = { ... } pattern
  const articleExportMatch = mdxContent.match(
    /export\s+const\s+article\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s,
  )

  if (!articleExportMatch) {
    return null
  }

  const articleBlock = articleExportMatch[1]

  // Extract individual fields
  const extractField = (fieldName: string): string => {
    // Handle multiline strings with template literals or quotes
    const patterns = [
      // Single line with quotes
      new RegExp(`${fieldName}:\\s*['"\`]([^'"\`]+)['"\`]`, 's'),
      // Multiline with quotes (greedy)
      new RegExp(`${fieldName}:\\s*['"\`]([\\s\\S]*?)['"\`]\\s*,`, 's'),
    ]

    for (const pattern of patterns) {
      const match = articleBlock.match(pattern)
      if (match) {
        return match[1].replace(/\s+/g, ' ').trim()
      }
    }

    return ''
  }

  return {
    title: extractField('title'),
    description: extractField('description'),
    author: extractField('author'),
    date: extractField('date'),
  }
}

/**
 * Extracts component usage from MDX content
 */
function extractComponentData(mdxContent: string): ComponentData[] {
  const components: ComponentData[] = []
  let position = 0

  // Extract ScenarioKeywords components
  const scenarioKeywordsRegex =
    /<ScenarioKeywords\s+keywords=\{(\[[\s\S]*?\])\}\s*\/>/g
  let match: RegExpExecArray | null

  while ((match = scenarioKeywordsRegex.exec(mdxContent)) !== null) {
    try {
      // Clean up the props string for JSON parsing
      const propsString = match[1]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')

      const keywords = JSON.parse(propsString)

      components.push({
        componentId: `scenario-keywords-${position}`,
        componentType: 'ScenarioKeywords',
        position: position++,
        props: { keywords },
      })
    } catch (e) {
      console.warn('Failed to parse ScenarioKeywords props:', e)
    }
  }

  // Extract EliminationList components
  const eliminationListRegex =
    /<EliminationList\s+items=\{(\[[\s\S]*?\])\}\s*\/>/g

  while ((match = eliminationListRegex.exec(mdxContent)) !== null) {
    try {
      const propsString = match[1]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')

      const items = JSON.parse(propsString)

      components.push({
        componentId: `elimination-list-${position}`,
        componentType: 'EliminationList',
        position: position++,
        props: { items },
      })
    } catch (e) {
      console.warn('Failed to parse EliminationList props:', e)
    }
  }

  return components
}

/**
 * Extracts image imports from MDX content
 */
function extractImageImports(
  mdxContent: string,
  articleDir: string,
): Map<string, ImageData> {
  const images = new Map<string, ImageData>()

  // Match import statements for images
  const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/g
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(mdxContent)) !== null) {
    const [, variableName, relativePath] = match
    const ext = extname(relativePath).toLowerCase()

    // Only process image files
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
      const localPath = join(articleDir, relativePath)

      if (existsSync(localPath)) {
        images.set(variableName, {
          id: variableName,
          s3Key: '', // Will be set during upload
          localPath,
          alt: variableName.replace(/([A-Z])/g, ' $1').trim(),
        })
      }
    }
  }

  return images
}

/**
 * Cleans MDX content for storage
 * Removes imports and export statements, keeps the content
 */
function cleanMdxContent(mdxContent: string): string {
  let content = mdxContent

  // Remove import statements
  content = content.replace(/^import\s+.*$/gm, '')

  // Remove export const article = {...}
  content = content.replace(
    /export\s+const\s+article\s*=\s*\{[\s\S]*?\}\s*;?/g,
    '',
  )

  // Remove export const metadata = {...}
  content = content.replace(
    /export\s+const\s+metadata\s*=\s*\{[\s\S]*?\}\s*;?/g,
    '',
  )

  // Remove export default statement
  content = content.replace(/export\s+default\s+.*$/gm, '')

  // Trim leading/trailing whitespace and normalize line breaks
  content = content.trim()

  // Remove excessive blank lines (more than 2)
  content = content.replace(/\n{3,}/g, '\n\n')

  return content
}

/**
 * Calculates reading time from content
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).filter(Boolean).length
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Uploads an image to S3
 */
async function uploadImageToS3(
  image: ImageData,
  slug: string,
): Promise<string> {
  const fileName = basename(image.localPath)
  const s3Key = `articles/${slug}/${fileName}`

  if (CONFIG.dryRun) {
    console.log(
      `  [DRY RUN] Would upload: ${image.localPath} -> s3://${CONFIG.bucketName}/${s3Key}`,
    )
    return s3Key
  }

  // Check if file already exists
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: CONFIG.bucketName,
        Key: s3Key,
      }),
    )
    console.log(`  Image already exists: ${s3Key}`)
    return s3Key
  } catch {
    // File doesn't exist, proceed with upload
  }

  const fileContent = readFileSync(image.localPath)
  const contentType = lookup(image.localPath) || 'application/octet-stream'

  await s3Client.send(
    new PutObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  console.log(`  Uploaded: ${s3Key}`)
  return s3Key
}

/**
 * Checks if article already exists in DynamoDB
 */
async function articleExists(slug: string): Promise<boolean> {
  if (CONFIG.dryRun) {
    return false
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: CONFIG.tableName,
        Key: {
          pk: `ARTICLE#${slug}`,
          sk: 'METADATA',
        },
      }),
    )
    return !!result.Item
  } catch {
    return false
  }
}

/**
 * Creates tag index items for an article
 */
async function createTagIndexItems(
  slug: string,
  tags: string[],
  date: string,
  title: string,
  description: string,
  author: string,
  readingTime: number,
): Promise<void> {
  if (!tags || tags.length === 0) {
    return
  }

  for (const tag of tags) {
    const tagIndexItem = {
      pk: `TAG#${tag.toLowerCase()}`,
      sk: `${date}#${slug}`,
      entityType: 'TAG_INDEX',
      tag: tag.toLowerCase(),
      
      // Denormalized article data for efficient queries
      articleSlug: slug,
      articleTitle: title,
      articleDescription: description,
      articleAuthor: author,
      articleDate: date,
      articleReadingTime: readingTime,
      articleTags: tags,
      
      gsi2pk: `TAG#${tag.toLowerCase()}`,
      gsi2sk: `${date}#${slug}`,
      createdAt: new Date().toISOString(),
    }

    if (CONFIG.dryRun) {
      console.log(`  [DRY RUN] Would create tag index: TAG#${tag.toLowerCase()}`)
    } else {
      await docClient.send(
        new PutCommand({
          TableName: CONFIG.tableName,
          Item: tagIndexItem,
        }),
      )
    }
  }

  if (!CONFIG.dryRun) {
    console.log(`  Created ${tags.length} tag index items`)
  }
}

/**
 * Writes article metadata to DynamoDB
 */
async function writeMetadataToDynamoDB(
  slug: string,
  metadata: ArticleMetadata,
  readingTime: number,
  featuredImage?: string,
): Promise<void> {
  const now = new Date().toISOString()

  const item = {
    pk: `ARTICLE#${slug}`,
    sk: 'METADATA',
    entityType: 'ARTICLE_METADATA',

    slug,
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    date: metadata.date,

    status: 'published',
    tags: extractTagsFromSlug(slug),
    category: 'AWS & DevOps',
    readingTimeMinutes: readingTime,
    featuredImage,

    createdAt: now, // PutCommand overwrites; for updates, updatedAt changes
    updatedAt: now,
    publishedAt: now,
    version: CONFIG.forceUpdate ? 2 : 1,

    gsi1pk: 'STATUS#published',
    gsi1sk: `${metadata.date}#${slug}`,
  }

  if (CONFIG.dryRun) {
    console.log(
      `  [DRY RUN] Would write metadata:`,
      JSON.stringify(item, null, 2),
    )
    return
  }

  await docClient.send(
    new PutCommand({
      TableName: CONFIG.tableName,
      Item: item,
    }),
  )

  console.log(`  Wrote metadata to DynamoDB`)
}

/**
 * Writes article content to DynamoDB
 */
async function writeContentToDynamoDB(
  slug: string,
  content: string,
  componentData: ComponentData[],
  images: Array<{ id: string; s3Key: string; alt: string }>,
): Promise<void> {
  const now = new Date().toISOString()

  const item = {
    pk: `ARTICLE#${slug}`,
    sk: 'CONTENT#v1',
    entityType: 'ARTICLE_CONTENT',

    contentType: 'mdx',
    content,

    componentData: componentData.length > 0 ? componentData : undefined,
    images,

    version: CONFIG.forceUpdate ? 2 : 1,
    createdAt: now,
    changelog: CONFIG.forceUpdate ? 'Updated via FORCE_UPDATE' : 'Initial migration from MDX files',
  }

  if (CONFIG.dryRun) {
    console.log(
      `  [DRY RUN] Would write content (${content.length} chars, ${images.length} images)`,
    )
    return
  }

  await docClient.send(
    new PutCommand({
      TableName: CONFIG.tableName,
      Item: item,
    }),
  )

  console.log(`  Wrote content to DynamoDB (${content.length} chars)`)
}

/**
 * Extracts tags from article slug
 */
function extractTagsFromSlug(slug: string): string[] {
  const tags: string[] = []

  if (slug.includes('aws')) tags.push('aws')
  if (slug.includes('devops')) tags.push('devops')
  if (slug.includes('exam') || slug.includes('certification'))
    tags.push('certification')
  if (slug.includes('lambda') || slug.includes('serverless'))
    tags.push('serverless')
  if (slug.includes('xray') || slug.includes('observability'))
    tags.push('observability')
  if (slug.includes('ami') || slug.includes('ec2')) tags.push('compute')
  if (slug.includes('cloudformation') || slug.includes('cdk')) tags.push('iac')
  if (slug.includes('service-catalog') || slug.includes('governance'))
    tags.push('governance')

  // Always add these if empty
  if (tags.length === 0) {
    tags.push('aws', 'devops')
  }

  return [...new Set(tags)]
}

/**
 * Migrates a single article
 */
async function migrateArticle(slug: string): Promise<MigrationResult> {
  const articleDir = join(CONFIG.articlesDir, slug)
  const mdxPath = join(articleDir, 'page.mdx')

  console.log(`\nMigrating: ${slug}`)

  try {
    // Check if MDX file exists
    if (!existsSync(mdxPath)) {
      return {
        slug,
        success: false,
        imagesUploaded: 0,
        error: 'MDX file not found',
      }
    }

    // Check if already migrated
    const exists = await articleExists(slug)
    if (exists && !CONFIG.forceUpdate) {
      console.log(`  Skipping: Already exists in DynamoDB (use FORCE_UPDATE=true to overwrite)`)
      return {
        slug,
        success: true,
        imagesUploaded: 0,
        error: 'Already migrated',
      }
    }
    if (exists && CONFIG.forceUpdate) {
      console.log(`  Updating: Overwriting existing article`)
    }

    // Read MDX content
    const mdxContent = readFileSync(mdxPath, 'utf-8')

    // Extract metadata
    const metadata = extractMetadata(mdxContent)
    if (!metadata || !metadata.title) {
      return {
        slug,
        success: false,
        imagesUploaded: 0,
        error: 'Could not extract metadata',
      }
    }

    console.log(`  Title: ${metadata.title}`)
    console.log(`  Date: ${metadata.date}`)

    // Extract images
    const imageImports = extractImageImports(mdxContent, articleDir)
    console.log(`  Found ${imageImports.size} images`)

    // Upload images to S3
    const uploadedImages: Array<{ id: string; s3Key: string; alt: string }> = []
    let featuredImage: string | undefined

    for (const [id, image] of imageImports) {
      const s3Key = await uploadImageToS3(image, slug)
      uploadedImages.push({
        id,
        s3Key,
        alt: image.alt,
      })

      // Use first image as featured image
      if (!featuredImage && CONFIG.cloudfrontDomain) {
        featuredImage = `https://${CONFIG.cloudfrontDomain}/${s3Key}`
      }
    }

    // Extract component data
    const componentData = extractComponentData(mdxContent)
    console.log(`  Found ${componentData.length} custom components`)

    // Clean content
    const cleanContent = cleanMdxContent(mdxContent)
    const readingTime = calculateReadingTime(cleanContent)
    console.log(`  Reading time: ${readingTime} minutes`)

    // Write to DynamoDB
    const tags = extractTagsFromSlug(slug)
    await writeMetadataToDynamoDB(slug, metadata, readingTime, featuredImage)
    await writeContentToDynamoDB(
      slug,
      cleanContent,
      componentData,
      uploadedImages,
    )
    await createTagIndexItems(
      slug,
      tags,
      metadata.date,
      metadata.title,
      metadata.description,
      metadata.author,
      readingTime,
    )

    return {
      slug,
      success: true,
      metadata,
      imagesUploaded: uploadedImages.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`  Error: ${errorMessage}`)
    return {
      slug,
      success: false,
      imagesUploaded: 0,
      error: errorMessage,
    }
  }
}

/**
 * Gets all article slugs from filesystem
 */
function getArticleSlugs(): string[] {
  const entries = readdirSync(CONFIG.articlesDir, { withFileTypes: true })

  return entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false
      const mdxPath = join(CONFIG.articlesDir, entry.name, 'page.mdx')
      return existsSync(mdxPath)
    })
    .map((entry) => entry.name)
}

// ========================================
// Main Execution
// ========================================

async function main() {
  console.log('='.repeat(60))
  console.log('Article Migration Script - MDX to DynamoDB')
  console.log('='.repeat(60))
  console.log(`\nConfiguration:`)
  console.log(`  Region:      ${CONFIG.region}`)
  if (CONFIG.profile) {
    console.log(`  Profile:     ${CONFIG.profile}`)
  }
  console.log(`  Table:       ${CONFIG.tableName}`)
  console.log(`  S3 Bucket:   ${CONFIG.bucketName}`)
  console.log(`  CloudFront:  ${CONFIG.cloudfrontDomain || '(not configured)'}`)
  console.log(`  Dry Run:     ${CONFIG.dryRun}`)
  console.log(`  Force Update:${CONFIG.forceUpdate}`)
  console.log(`  Articles:    ${CONFIG.articlesDir}`)

  if (CONFIG.dryRun) {
    console.log('\n** DRY RUN MODE - No changes will be made **\n')
  }

  // Get all article slugs
  const slugs = getArticleSlugs()
  console.log(`\nFound ${slugs.length} articles to migrate:`)
  slugs.forEach((slug) => console.log(`  - ${slug}`))

  // Migrate each article
  const results: MigrationResult[] = []

  for (const slug of slugs) {
    const result = await migrateArticle(slug)
    results.push(result)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Migration Summary')
  console.log('='.repeat(60))

  const successful = results.filter(
    (r) => r.success && !r.error?.includes('Already'),
  )
  const updated = successful.filter(() => CONFIG.forceUpdate)
  const created = successful.filter(() => !CONFIG.forceUpdate)
  const skipped = results.filter((r) => r.error?.includes('Already'))
  const failed = results.filter((r) => !r.success)

  if (CONFIG.forceUpdate) {
    console.log(`\nUpdated: ${updated.length}`)
    updated.forEach((r) =>
      console.log(`  - ${r.slug} (${r.imagesUploaded} images)`),
    )
  } else {
    console.log(`\nSuccessfully migrated: ${created.length}`)
    created.forEach((r) =>
      console.log(`  - ${r.slug} (${r.imagesUploaded} images)`),
    )
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (already exists): ${skipped.length}`)
    skipped.forEach((r) => console.log(`  - ${r.slug}`))
  }

  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}`)
    failed.forEach((r) => console.log(`  - ${r.slug}: ${r.error}`))
  }

  const totalImages = results.reduce((sum, r) => sum + r.imagesUploaded, 0)
  console.log(`\nTotal images uploaded: ${totalImages}`)

  if (CONFIG.dryRun) {
    console.log(
      '\n** This was a dry run. Run without DRY_RUN=true to apply changes. **',
    )
  }
}

main().catch((error) => {
  console.error('\nMigration failed:', error)
  process.exit(1)
})
