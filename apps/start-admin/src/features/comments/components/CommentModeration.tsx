'use client'

import { useState } from 'react'
import { useToastStore } from '@/lib/stores/toast-store'
import {
  useAdminComments,
  useModerateComment,
  useDeleteComment,
} from '@/hooks/use-admin-comments'

import { CommentInput } from './CommentInput'
import { CommentItem, type CommentData } from './CommentItem'
import { AnalyticsSidebar } from './AnalyticsSidebar'

export function CommentModeration() {
  const { addToast } = useToastStore()

  const { data: comments, isLoading, error } = useAdminComments()
  const { mutate: moderateComment, isPending: isModerating } = useModerateComment()
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment()

  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top'>('newest')

  const handleApprove = (comment: CommentData) => {
    const compositeId = `${comment.articleSlug}__COMMENT#${String(comment.createdAt)}#${comment.commentId}`
    moderateComment(
      { compositeId, action: 'approve' },
      {
        onSuccess: () => addToast('success', 'Comment approved.'),
        onError: () => addToast('error', 'Failed to approve comment.'),
      }
    )
  }

  const handleReject = (comment: CommentData) => {
    const compositeId = `${comment.articleSlug}__COMMENT#${String(comment.createdAt)}#${comment.commentId}`
    moderateComment(
      { compositeId, action: 'reject' },
      {
        onSuccess: () => addToast('success', 'Comment rejected.'),
        onError: () => addToast('error', 'Failed to reject comment.'),
      }
    )
  }

  const handleDelete = (comment: CommentData) => {
    if (!window.confirm('Are you sure you want to permanently delete this comment?')) {
      return
    }

    const compositeId = `${comment.articleSlug}__COMMENT#${String(comment.createdAt)}#${comment.commentId}`
    deleteComment(compositeId, {
      onSuccess: () => addToast('success', 'Comment deleted.'),
      onError: () => addToast('error', 'Failed to delete comment.'),
    })
  }

  const handlePostNewComment = (_body: string) => {
    addToast('info', 'Submitting comments from Admin is not implemented by the backend API.')
  }

  const handleReply = (_parentId: string, _body: string) => {
    addToast('info', 'Threaded replies are not natively implemented in the current DynamoDB schema.')
  }

  const handleLike = (_id: string) => {
    addToast('info', 'Liking comments as Admin is restricted.')
  }

  const handleFlag = (_id: string) => {
    addToast('info', 'Flagging is a planned feature.')
  }

  if (isLoading) {
    return (
      <main>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm/6 text-zinc-400">Loading comments...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm/6 text-red-500">Failed to load comments.</p>
        </div>
      </main>
    )
  }

  // Derived state: sorted comments
  const sortedComments = [...(comments ?? [])]
  switch (sortBy) {
    case 'newest':
      sortedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'oldest':
      sortedComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'top':
      // They don't have native likes, but sorting just keeps them stable.
      break
    default:
      break
  }

  return (
    <main>
      <div className="relative isolate overflow-hidden">
        {/* Header */}
        <header className="pt-6 pb-4 sm:pb-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
            <div>
              <h1 className="text-base/7 font-semibold text-white">Engagement Dashboard</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Monitor discussion sentiment, track engagement metrics, and join the conversation.
              </p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 pl-2.5 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-500/20">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                {comments?.length ?? 0} Pending
              </span>
            </div>
          </div>
        </header>

        {/* Gradient background decoration */}
        <div
          aria-hidden="true"
          className="absolute top-full left-0 -z-10 mt-96 origin-top-left translate-y-40 -rotate-90 transform-gpu opacity-10 blur-3xl sm:left-1/2 sm:-mt-10 sm:-ml-96 sm:translate-y-0 sm:rotate-0 sm:opacity-30"
        >
          <div
            style={{
              clipPath:
                'polygon(100% 38.5%, 82.6% 100%, 60.2% 37.7%, 52.4% 32.1%, 47.5% 41.8%, 45.2% 65.6%, 27.5% 23.4%, 0.1% 35.3%, 17.9% 0%, 27.7% 23.4%, 76.2% 2.5%, 74.2% 56%, 100% 38.5%)',
            }}
            className="aspect-1154/678 w-288.5 bg-linear-to-br from-[#FF80B5] to-[#9089FC]"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Engagement Panel (col-span 2) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Post New Comment */}
            <section>
              <h2 className="mb-4 text-base font-semibold text-white">Join the Discussion</h2>
              <CommentInput onSubmit={handlePostNewComment} />
            </section>

            {/* Comment Thread */}
            <section>
              <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-base font-semibold text-white">Comments</h2>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="hidden sm:inline">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="rounded-md border-0 bg-white/5 py-1.5 pl-3 pr-8 text-sm text-white focus:ring-2 focus:ring-inset focus:ring-teal-500 sm:text-sm sm:leading-6"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="top">Top Liked</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                {sortedComments.length > 0 ? (
                  sortedComments.map((comment) => (
                    <CommentItem
                      key={comment.commentId}
                      comment={comment}
                      onLike={handleLike}
                      onReply={handleReply}
                      onFlag={handleFlag}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onDelete={handleDelete}
                      isModerating={isModerating}
                      isDeleting={isDeleting}
                    />
                  ))
                ) : (
                  <p className="text-center text-sm text-zinc-500 py-8">
                    No comments yet. Be the first to start the discussion!
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Right Sidebar: Analytics */}
          <div className="lg:col-span-1">
            <AnalyticsSidebar comments={comments ?? []} />
          </div>
        </div>
      </div>
    </main>
  )
}
