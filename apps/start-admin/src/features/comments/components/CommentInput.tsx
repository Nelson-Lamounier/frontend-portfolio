import { useState } from 'react'
import {
  FireIcon,
  HandRaisedIcon,
  HeartIcon,
  LightBulbIcon,
  RocketLaunchIcon,
} from '@heroicons/react/20/solid'

interface CommentInputProps {
  onSubmit: (body: string) => void
}

const REACTIONS = [
  { icon: HeartIcon, label: 'Love this!' },
  { icon: FireIcon, label: 'Hot take' },
  { icon: LightBulbIcon, label: 'Great idea' },
  { icon: HandRaisedIcon, label: 'Wait a minute...' },
  { icon: RocketLaunchIcon, label: 'Spot on!' },
]

export function CommentInput({ onSubmit }: CommentInputProps) {
  const [body, setBody] = useState('')

  const handleReactionClick = (label: string) => {
    setBody((prev) => (prev ? `${prev} ${label}` : label))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    onSubmit(body)
    setBody('')
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-800/50 p-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <label htmlFor="comment" className="sr-only">
          Add your comment
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="block w-full resize-none rounded-lg border-0 bg-white/5 py-2.5 text-white placeholder-zinc-400 focus:ring-2 focus:ring-inset focus:ring-teal-500 sm:text-sm sm:leading-6"
          placeholder="Add your comment..."
        />
        
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.label}
                type="button"
                onClick={() => handleReactionClick(reaction.label)}
                className="inline-flex items-center gap-x-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-white"
              >
                <reaction.icon className="-ml-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
                {reaction.label}
              </button>
            ))}
          </div>
          
          <button
            type="submit"
            disabled={!body.trim()}
            className="inline-flex items-center rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post Comment
          </button>
        </div>
      </form>
    </div>
  )
}
