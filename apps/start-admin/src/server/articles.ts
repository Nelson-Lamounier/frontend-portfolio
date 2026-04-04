import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  isDynamoDBConfigured,
  queryDraftArticles,
  queryPublishedArticles,
  getArticleMetadataBySlug,
  updateArticleMetadata,
  publishArticle,
  unpublishArticle,
  deleteArticle,
} from '@/lib/articles/dynamodb-articles'

import {
  fetchArticleContent,
  putArticleContent,
} from '@/lib/articles/s3-content'

export const getArticlesFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const status = (ctx.data && typeof ctx.data === 'object' && 'status' in ctx.data) ? ctx.data.status : 'draft'

    if (!isDynamoDBConfigured()) {
      throw new Error('DynamoDB is not configured — set DYNAMODB_TABLE_NAME in .env.local')
    }

    if (status === 'all') {
      const [drafts, published] = await Promise.all([
        queryDraftArticles(),
        queryPublishedArticles(),
      ])
      return {
        drafts,
        published,
        draftCount: drafts.length,
        publishedCount: published.length,
      }
    }

    if (status === 'published') {
      const published = await queryPublishedArticles()
      return { articles: published, count: published.length }
    }

    const drafts = await queryDraftArticles()
    return { articles: drafts, count: drafts.length }
  })

export const getArticleMetadataFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const id = z.string().parse(ctx.data)
    const article = await getArticleMetadataBySlug(id)
    if (!article) {
      throw new Error('Article not found')
    }
    return article
  })

export const saveArticleMetadataFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const metadata = z.any().parse(ctx.data)
    await updateArticleMetadata(metadata.slug, metadata)
    return { success: true }
  })

export const getArticleContentFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const id = z.string().parse(ctx.data)
    const content = await fetchArticleContent(`articles/${id}/content.mdx`)
    const metadata = await getArticleMetadataBySlug(id)
    return { 
      content: content?.content || '',
      title: metadata?.title || id,
      description: metadata?.description || '',
      status: metadata?.status || 'draft'
    }
  })

export const saveArticleContentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const data = z.object({ id: z.string(), content: z.string() }).parse(ctx.data)
    await putArticleContent(`articles/${data.id}/content.mdx`, data.content)
    return { success: true }
  })

export const publishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const id = z.string().parse(ctx.data)
    await publishArticle(id)
    return { success: true }
  })

export const unpublishArticleFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const id = z.string().parse(ctx.data)
    await unpublishArticle(id)
    return { success: true }
  })

export const deleteArticleFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const id = z.string().parse(ctx.data)
    await deleteArticle(id)
    return { success: true }
  })
