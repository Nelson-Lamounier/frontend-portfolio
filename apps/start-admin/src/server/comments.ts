import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  isEngagementDBConfigured,
  getPendingComments,
  moderateComment,
  deleteComment,
} from '@/lib/articles/dynamodb-engagement'

export const getPendingCommentsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    if (!isEngagementDBConfigured()) {
      throw new Error('Engagement DB is not configured')
    }
    return await getPendingComments()
  })

export const moderateCommentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const data = z.object({
      id: z.string(),
      status: z.enum(['approve', 'reject']),
    }).parse(ctx.data)
    
    // id format: slug__sk
    const [slug, ...skParts] = data.id.split('__')
    const sk = skParts.join('__')

    await moderateComment(slug, sk, data.status)
    return { success: true }
  })

export const deleteCommentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: { data: any }) => {
    const id = z.string().parse(ctx.data)
    
    const [slug, ...skParts] = id.split('__')
    const sk = skParts.join('__')

    await deleteComment(slug, sk)
    return { success: true }
  })
