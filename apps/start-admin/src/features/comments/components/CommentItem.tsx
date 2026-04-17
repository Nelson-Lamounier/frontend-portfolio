
import {
  ChatBubbleLeftRightIcon,
  FlagIcon,
  HandThumbUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon
} from '@heroicons/react/20/solid'

export interface CommentData {
  id?: string
  commentId?: string
  name?: string
  author?: { name?: string }
  createdAt?: string | number | Date
  articleSlug?: string
  status?: string
  email?: string
  body?: React.ReactNode
  isLikedByMe?: boolean
  likes?: number
  replies?: CommentData[]
}

interface CommentItemProps {
  comment: CommentData
  onLike?: (id: string) => void
  onReply?: (parentId: string, body: string) => void
  onFlag?: (id: string) => void
  onApprove?: (comment: CommentData) => void
  onReject?: (comment: CommentData) => void
  onDelete?: (comment: CommentData) => void
  isModerating?: boolean
  isDeleting?: boolean
  level?: number
}

function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function CommentItem({ 
  comment, 
  onLike, 
  onReply, 
  onFlag, 
  onApprove, 
  onReject, 
  onDelete,
  isModerating,
  isDeleting,
  level = 0 
}: CommentItemProps) {
  const isNested = level > 0

  const handleReplyPrompt = () => {
    if (!onReply) return
    const body = window.prompt(`Reply to ${comment.name || comment.author?.name}:`)
    const cid = comment.commentId || comment.id
    if (cid && body?.trim()) {
      onReply(cid, body)
    }
  }
  
  const d = new Date(comment.createdAt ?? Date.now())
  const dateStr = isNaN(d.getTime()) 
    ? 'Unknown Date' 
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })

  return (
    <div className={classNames('flex gap-x-4', isNested ? 'mt-4 border-l-2 border-white/10 pl-4' : '')}>
      <div className="flex-auto rounded-lg border border-white/5 bg-zinc-800/20 p-4">
        <div className="flex items-start justify-between gap-x-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-2">
            <span className="font-medium text-white">{comment.name || comment.author?.name || 'Anonymous'}</span>
            <span className="text-xs text-zinc-500">{dateStr}</span>
            {comment.articleSlug && (
              <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-white/10">
                Article: {comment.articleSlug}
              </span>
            )}
            {comment.status && (
              <span className={classNames(
                comment.status === 'approved' ? 'bg-green-500/10 text-green-400 ring-green-500/20' : 
                comment.status === 'rejected' ? 'bg-red-500/10 text-red-400 ring-red-500/20' :
                'bg-yellow-500/10 text-yellow-500 ring-yellow-500/20',
                "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
              )}>
                {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
              </span>
            )}
          </div>
        </div>
        
        {comment.email && (
           <div className="mt-1 text-xs text-zinc-500">{comment.email}</div>
        )}

        <div className="mt-2 text-sm text-zinc-300 break-words">
          {comment.body}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-x-4">
            <button
              type="button"
              onClick={() => { const cid = comment.commentId || comment.id; if(onLike && cid) onLike(cid) }}
              className={classNames(
                comment.isLikedByMe ? 'text-teal-400' : 'text-zinc-400 hover:text-zinc-300',
                "flex items-center gap-x-1.5 text-sm font-medium"
              )}
            >
              <HandThumbUpIcon className="h-4 w-4" />
              {comment.likes || 0}
            </button>
            <button
              type="button"
              onClick={handleReplyPrompt}
              className="flex items-center gap-x-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-300"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Reply
            </button>
            <button
              type="button"
              onClick={() => { const cid = comment.commentId || comment.id; if(onFlag && cid) onFlag(cid) }}
              className="flex items-center gap-x-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-300"
            >
              <FlagIcon className="h-4 w-4" />
              Flag
            </button>
          </div>
          
          <div className="flex items-center gap-x-3">
             {onApprove && comment.status !== 'approved' && (
                <button
                  onClick={() => onApprove(comment)}
                  disabled={isModerating}
                  className="flex items-center gap-x-1 text-sm font-medium text-green-400 hover:text-green-300 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Approve
                </button>
             )}
             {onReject && comment.status !== 'rejected' && (
                <button
                  onClick={() => onReject(comment)}
                  disabled={isModerating}
                  className="flex items-center gap-x-1 text-sm font-medium text-yellow-500 hover:text-yellow-400 disabled:opacity-50"
                >
                  <XCircleIcon className="h-4 w-4" />
                  Reject
                </button>
             )}
             {onDelete && (
                <button
                  onClick={() => onDelete(comment)}
                  disabled={isDeleting}
                  className="flex items-center gap-x-1 text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
             )}
          </div>
        </div>

        {/* Recursive Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 flex flex-col gap-y-4">
            {comment.replies.map((reply: CommentData) => (
              <CommentItem
                key={reply.id || reply.commentId}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                onFlag={onFlag}
                onApprove={onApprove}
                onReject={onReject}
                onDelete={onDelete}
                isModerating={isModerating}
                isDeleting={isDeleting}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
