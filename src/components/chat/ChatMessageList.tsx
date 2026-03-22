/**
 * @format
 * Chat Message List
 *
 * Scrollable container that renders the conversation history.
 * User messages are right-aligned with a teal accent;
 * agent messages are left-aligned with a neutral background.
 * Shows a typing indicator when the agent is processing.
 */

'use client'

import { useEffect, useRef } from 'react'

import type { ChatMessage } from '@/lib/types/chat.types'

// =============================================================================
// PROPS
// =============================================================================

interface ChatMessageListProps {
  /** Conversation messages to display */
  readonly messages: ChatMessage[]
  /** Whether the agent is currently processing */
  readonly isLoading: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders the list of chat messages with auto-scroll behaviour.
 *
 * @param props - Messages array and loading state
 * @returns Scrollable message list JSX
 */
export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="text-3xl mb-3">💬</div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Ask me anything about this portfolio
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            I know about the projects, architecture, and skills showcased here.
          </p>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`
              max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
              ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-md'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 rounded-bl-md'
              }
            `}
          >
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            <time
              className={`
                block text-[10px] mt-1
                ${msg.role === 'user' ? 'text-teal-200' : 'text-zinc-400 dark:text-zinc-500'}
              `}
              dateTime={msg.timestamp}
            >
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-zinc-100 dark:bg-zinc-700 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex space-x-1.5" aria-label="Agent is typing">
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
