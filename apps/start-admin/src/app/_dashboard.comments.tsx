import { createFileRoute } from '@tanstack/react-router'
import { CommentModeration } from '../features/comments/components/CommentModeration'

export const Route = createFileRoute('/_dashboard/comments')({
  component: CommentModeration,
})
