import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  listResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
  setActiveResume,
  getActiveResume,
} from '@/lib/resumes/dynamodb-resumes'
import type { ResumeData } from '@/lib/resumes/resume-data'

export const getResumesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return await listResumes()
  },
)

export const getResumeFn = createServerFn({ method: 'GET' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const resumeId = z.string().parse(ctx.data)
    return await getResume(resumeId)
  })

export const createResumeFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const data = z.object({
      label: z.string(),
      data: z.any(),
    }).parse(ctx.data)
    return await createResume(data.label, data.data as ResumeData)
  })

export const updateResumeFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const data = z.object({
      resumeId: z.string(),
      label: z.string(),
      data: z.any(),
    }).parse(ctx.data)
    return await updateResume(data.resumeId, data.label, data.data as ResumeData)
  })

export const deleteResumeFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const resumeId = z.string().parse(ctx.data)
    await deleteResume(resumeId)
    return { success: true }
  })

export const setActiveResumeFn = createServerFn({ method: 'POST' })
  .inputValidator((d: any) => d)
  .handler(async (ctx: any) => {
    const resumeId = z.string().parse(ctx.data)
    return await setActiveResume(resumeId)
  })

export const getActiveResumeFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return await getActiveResume()
  })

