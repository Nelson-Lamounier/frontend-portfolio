/**
 * @format
 * Chat Widget
 *
 * Floating chat component that connects to the Bedrock Agent.
 * Renders as a circular button in the bottom-right corner.
 * Expands to a full chat panel with message history and input.
 */

'use client'

import { useCallback, useState } from 'react'

import { sendChatMessage } from '@/lib/chat-service'
import type { ChatMessage, ChatWidgetState } from '@/lib/types/chat.types'

import { ChatInput } from './ChatInput'
import { ChatMessageList } from './ChatMessageList'

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generates a unique message ID using timestamp + random suffix.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const INITIAL_STATE: ChatWidgetState = {
  isOpen: false,
  messages: [],
  sessionId: null,
  isLoading: false,
  error: null,
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Floating chat widget that provides a conversational interface
 * to the Bedrock Agent (Claude 3.5 Haiku + Portfolio Knowledge Base).
 *
 * @returns Chat bubble button + expandable chat panel
 */
export function ChatWidget() {
  const [state, setState] = useState<ChatWidgetState>(INITIAL_STATE)

  /**
   * Toggles the chat panel open/closed.
   */
  const toggleOpen = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  /**
   * Handles sending a user message and receiving the agent response.
   *
   * @param prompt - The user's message text
   */
  const handleSend = useCallback(async (prompt: string) => {
    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    }

    // Optimistic update — show user message + loading state
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }))

    // Call the chat service
    const result = await sendChatMessage(prompt, state.sessionId ?? undefined)

    if (result.ok) {
      const agentMessage: ChatMessage = {
        id: generateId(),
        role: 'agent',
        content: result.data.message,
        timestamp: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, agentMessage],
        sessionId: result.data.sessionId || prev.sessionId,
        isLoading: false,
        error: null,
      }))
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error.error,
      }))
    }
  }, [state.sessionId])

  /**
   * Clears the conversation history and starts a fresh session.
   */
  const handleClear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      sessionId: null,
      error: null,
    }))
  }, [])

  return (
    <>
      {/* ── Chat Panel ──────────────────────────────────────────────── */}
      {state.isOpen && (
        <div
          className="
            fixed z-[60]
            inset-0 sm:inset-auto
            sm:bottom-20 sm:right-4
            sm:w-[360px] sm:max-w-[calc(100vw-2rem)]
            sm:h-[500px] sm:max-h-[calc(100vh-7rem)]
            bg-white dark:bg-zinc-800
            sm:rounded-2xl shadow-2xl
            sm:border sm:border-zinc-200 dark:sm:border-zinc-700
            flex flex-col
          "
          role="dialog"
          aria-label="Chat with AI assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                    <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 0 0 1.33 0l1.713-3.293a.783.783 0 0 1 .642-.413 41.102 41.102 0 0 0 3.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2ZM6.75 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-800 rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Portfolio Assistant
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Powered by AWS Bedrock
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear conversation */}
              {state.messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              {/* Close */}
              <button
                onClick={toggleOpen}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Close chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <ChatMessageList messages={state.messages} isLoading={state.isLoading} />

          {/* Error banner */}
          {state.error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
            </div>
          )}

          {/* Input */}
          <ChatInput onSend={handleSend} isLoading={state.isLoading} />
        </div>
      )}

      {/* ── Floating Toggle Button ──────────────────────────────────── */}
      <button
        onClick={toggleOpen}
        className={`
          fixed bottom-4 right-4 z-[60]
          w-12 h-12 sm:w-14 sm:h-14 rounded-full
          ${state.isOpen ? 'hidden sm:flex' : 'flex'}
          bg-gradient-to-br from-teal-500 to-teal-700
          hover:from-teal-400 hover:to-teal-600
          shadow-lg hover:shadow-xl
          items-center justify-center
          transition-all duration-200 hover:scale-105
          group
        `}
        aria-label={state.isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={state.isOpen}
      >
        {state.isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white">
            <path fillRule="evenodd" d="M14.77 4.21a.75.75 0 0 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L6.21 5.27a.75.75 0 0 1 1.06-1.06L10 6.94l4.77-4.73Zm0 6a.75.75 0 0 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 1.06-1.06L10 12.94l4.77-4.73Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white">
            <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 0 0 1.33 0l1.713-3.293a.783.783 0 0 1 .642-.413 41.102 41.102 0 0 0 3.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2ZM6.75 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </>
  )
}
