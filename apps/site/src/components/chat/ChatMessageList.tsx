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

import { useEffect, useRef, useState } from 'react'

import type { ChatMessage } from '@/lib/types/chat.types'

// =============================================================================
// LOADING MESSAGES
// =============================================================================

const LOADING_MESSAGES = [
  'Lami is searching the knowledge base...',
  'Pulling in project details and metrics...',
  'Checking infrastructure and deployment data...',
  'Almost there...',
] as const

function useLoadingMessage(isLoading: boolean): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setIndex(0)
      return
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(id)
  }, [isLoading])

  return LOADING_MESSAGES[index]
}

// =============================================================================
// SAMPLE QUESTIONS
// =============================================================================

interface SampleQuestion {
  readonly label: string
  readonly sublabel: string
  readonly prompt: string
}

/** Pre-fabricated questions that showcase the assistant's capabilities */
const SAMPLE_QUESTIONS: readonly SampleQuestion[] = [
  {
    label: 'Portfolio projects',
    sublabel: 'What has Nelson built?',
    prompt: 'What projects are in your portfolio?',
  },
  {
    label: 'AWS infrastructure',
    sublabel: 'CDK, VPC, Kubernetes',
    prompt: 'Tell me about your AWS infrastructure',
  },
  {
    label: 'Certifications',
    sublabel: 'Credentials and qualifications',
    prompt: 'What certifications do you hold?',
  },
  {
    label: 'Kubernetes setup',
    sublabel: 'Cluster bootstrap and ops',
    prompt: 'How is your Kubernetes cluster set up?',
  },
] as const

// =============================================================================
// PROPS
// =============================================================================

interface ChatMessageListProps {
  /** Conversation messages to display */
  readonly messages: ChatMessage[]
  /** Whether the agent is currently processing */
  readonly isLoading: boolean
  /** Callback when a sample question is clicked */
  readonly onSuggestionClick?: (prompt: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders the list of chat messages with auto-scroll behaviour.
 *
 * @param props - Messages array, loading state, and optional suggestion click handler
 * @returns Scrollable message list JSX
 */
export function ChatMessageList({ messages, isLoading, onSuggestionClick }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadingMessage = useLoadingMessage(isLoading)

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {/* Welcome state with sample questions */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M10 1c.956 0 1.886.078 2.784.227a.75.75 0 0 1-.237 1.481A11.516 11.516 0 0 0 10 2.5c-5.006 0-8.5 3.005-8.5 5.5s3.494 5.5 8.5 5.5c5.006 0 8.5-3.005 8.5-5.5 0-1.093-.59-2.18-1.653-3.073a.75.75 0 1 1 .976-1.14C19.084 4.897 20 6.332 20 8c0 3.546-4.432 7-10 7-1.574 0-3.065-.27-4.39-.75L1.5 16V12.24C.527 11.09 0 9.626 0 8c0-3.546 4.432-7 10-7Zm4 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM7 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
          </div>

          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            Hi! I&apos;m Lami
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-[260px]">
            Nelson&apos;s portfolio assistant. Ask me about his projects, infrastructure, and certifications.
          </p>

          <div className="w-full">
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Try asking
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q.prompt}
                  type="button"
                  onClick={() => onSuggestionClick?.(q.prompt)}
                  className="
                    text-left px-3 py-2.5
                    rounded-xl border border-zinc-200 dark:border-zinc-600
                    bg-zinc-50 dark:bg-zinc-700/50
                    hover:bg-teal-50 hover:border-teal-300
                    dark:hover:bg-teal-900/20 dark:hover:border-teal-600
                    transition-all duration-150 cursor-pointer group
                  "
                >
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-teal-700 dark:group-hover:text-teal-300 leading-tight">
                    {q.label}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 group-hover:text-teal-500 dark:group-hover:text-teal-500 mt-0.5 leading-tight">
                    {q.sublabel}
                  </p>
                </button>
              ))}
            </div>
          </div>
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
              rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
              ${
                msg.role === 'user'
                  ? 'max-w-[85%] bg-teal-600 text-white rounded-br-md'
                  : 'w-full bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 rounded-bl-md'
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

      {/* Loading message */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-2xl rounded-bl-md px-3.5 py-2.5">
            <p className="text-sm text-zinc-400 dark:text-zinc-500 italic" aria-live="polite">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
