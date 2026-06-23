#!/usr/bin/env tsx
/**
 * Static Assets S3 Sync Script
 *
 * Syncs Next.js static assets (.next/static) to S3 for CloudFront serving
 * and invalidates the CloudFront cache.
 *
 * Usage:
 *   npx tsx scripts/sync-static-to-s3.ts --env development --region eu-west-1
 *
 * BlueGreen safety:
 *   The S3 cleanup keeps the current build ID and the most recent previous
 *   build ID so old pods continue serving their asset hashes during the
 *   rollout transition window. Shared dirs (chunks/css/media) are never
 *   deleted here — they are content-hashed and cleaned by S3 lifecycle rules.
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'

import {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import {
    CloudFrontClient,
    CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import { lookup as mimeType } from 'mime-types'

// =============================================================================
// Args
// =============================================================================

function parseArgs(): Record<string, string | boolean> {
    const result: Record<string, string | boolean> = {}
    const argv = process.argv.slice(2)
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        if (arg.startsWith('--')) {
            const key = arg.slice(2)
            const next = argv[i + 1]
            if (next && !next.startsWith('--')) {
                result[key] = next
                i++
            } else {
                result[key] = true
            }
        }
    }
    return result
}

const args = parseArgs()
const region = (args['region'] as string) || 'eu-west-1'
const environment = (args['env'] as string) || 'development'
const skipInvalidation = Boolean(args['skip-invalidation'])

// =============================================================================
// Helpers
// =============================================================================

function getAllFiles(dir: string): string[] {
    const files: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...getAllFiles(fullPath))
        } else {
            files.push(fullPath)
        }
    }
    return files
}

async function getSSMParam(name: string, paramRegion = region): Promise<string | undefined> {
    const client = new SSMClient({ region: paramRegion })
    try {
        const res = await client.send(new GetParameterCommand({ Name: name }))
        return res.Parameter?.Value ?? undefined
    } catch {
        return undefined
    }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
    const projectRoot = join(import.meta.dirname ?? __dirname, '..')
    const staticDir = join(projectRoot, '.next', 'static')

    console.log(`\n📦 Static Assets S3 Sync — ${environment} (${region})`)

    // ── Step 1: Verify static assets exist ─────────────────────────────────
    if (!existsSync(staticDir)) {
        console.error(`[FAIL] .next/static not found at: ${staticDir}`)
        process.exit(1)
    }
    const allFiles = getAllFiles(staticDir)
    console.log(`[1/5] Found ${allFiles.length} static assets`)

    // ── Step 2: Resolve S3 bucket from SSM ─────────────────────────────────
    console.log('[2/5] Resolving S3 bucket from SSM...')
    const bucketRaw =
        (await getSSMParam(`/nextjs/${environment}/assets-bucket-name`)) ??
        (await getSSMParam(`/nextjs/${environment}/s3/static-assets-bucket`))

    if (!bucketRaw) {
        console.error('[FAIL] S3 bucket SSM parameter not found.')
        console.error(`  Tried: /nextjs/${environment}/assets-bucket-name`)
        process.exit(1)
    }
    const bucket = bucketRaw.replace(/^s3:\/\//, '').replace(/\/$/, '')
    console.log(`[2/5] Bucket: ${bucket}`)

    const s3 = new S3Client({ region })

    // ── Step 3: Upload static assets ───────────────────────────────────────
    console.log('[3/5] Uploading .next/static → S3 _next/static/...')
    let uploaded = 0
    for (const filePath of allFiles) {
        const rel = relative(staticDir, filePath)
        const key = `_next/static/${rel}`
        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: readFileSync(filePath),
                ContentType: mimeType(filePath) || 'application/octet-stream',
                // Content-hashed filenames — safe to cache forever
                CacheControl: 'public, max-age=31536000, immutable',
            }),
        )
        uploaded++
    }
    console.log(`[3/5] Uploaded ${uploaded} files`)

    // ── Step 4: BlueGreen-safe cleanup ─────────────────────────────────────
    // Keep current build ID + most recent previous build ID.
    // Shared dirs (chunks/css/media) are never deleted.
    console.log('[4/5] Cleaning stale build IDs from S3...')

    const sharedDirs = new Set(['chunks', 'css', 'media'])

    const localBuildId = readdirSync(staticDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && !sharedDirs.has(e.name))
        .map(e => e.name)[0]

    const s3BuildIds: string[] = []
    const allS3Keys: string[] = []
    let token: string | undefined

    do {
        const res = await s3.send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: '_next/static/', ContinuationToken: token }),
        )
        for (const obj of res.Contents ?? []) {
            if (!obj.Key) continue
            allS3Keys.push(obj.Key)
            const seg = obj.Key.replace('_next/static/', '').split('/')[0]
            if (!sharedDirs.has(seg) && !s3BuildIds.includes(seg)) {
                s3BuildIds.push(seg)
            }
        }
        token = res.NextContinuationToken
    } while (token)

    const keep = new Set<string>()
    if (localBuildId) keep.add(localBuildId)
    // Keep one previous build ID for BlueGreen transition window
    for (const id of s3BuildIds) {
        if (id !== localBuildId) { keep.add(id); break }
    }

    const stale = allS3Keys.filter(key => {
        const seg = key.replace('_next/static/', '').split('/')[0]
        return !sharedDirs.has(seg) && !keep.has(seg)
    })

    if (stale.length > 0) {
        for (let i = 0; i < stale.length; i += 1000) {
            await s3.send(
                new DeleteObjectsCommand({
                    Bucket: bucket,
                    Delete: { Objects: stale.slice(i, i + 1000).map(Key => ({ Key })) },
                }),
            )
        }
        console.log(`[4/5] Deleted ${stale.length} stale files (kept build IDs: ${[...keep].join(', ')})`)
    } else {
        console.log('[4/5] No stale files to delete')
    }

    // ── Step 5: CloudFront invalidation ────────────────────────────────────
    if (skipInvalidation) {
        console.log('[5/5] Skipping CloudFront invalidation (--skip-invalidation)')
    } else {
        console.log('[5/5] Invalidating CloudFront...')
        // CloudFront SSM param lives in us-east-1 (global service)
        const distId = await getSSMParam(
            `/nextjs/${environment}/cloudfront/distribution-id`,
            'us-east-1',
        )
        if (!distId) {
            console.warn('[WARN] CloudFront distribution ID not found in SSM — skipping invalidation')
        } else {
            const cf = new CloudFrontClient({ region: 'us-east-1' })
            const res = await cf.send(
                new CreateInvalidationCommand({
                    DistributionId: distId,
                    InvalidationBatch: {
                        CallerReference: `sync-${Date.now()}`,
                        Paths: {
                            Quantity: 3,
                            Items: ['/_next/static/*', '/_next/data/*', '/images/*'],
                        },
                    },
                }),
            )
            console.log(`[5/5] Invalidation created: ${res.Invalidation?.Id}`)
        }
    }

    console.log(`\n✓ Sync complete — ${uploaded} files → s3://${bucket}/_next/static/\n`)
}

main().catch(err => {
    console.error('[FAIL]', err.message)
    process.exit(1)
})
