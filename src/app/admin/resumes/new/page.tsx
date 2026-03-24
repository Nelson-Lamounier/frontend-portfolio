/**
 * Create Resume Page
 *
 * Route: /admin/resumes/new
 * Access: Authenticated admin session (NextAuth.js)
 */

'use client'

import { ResumeForm } from '@/components/resume/ResumeForm'

/**
 * Admin page for creating a new resume version.
 *
 * @returns Create resume form page
 */
export default function CreateResumePage() {
  return <ResumeForm mode="create" />
}
