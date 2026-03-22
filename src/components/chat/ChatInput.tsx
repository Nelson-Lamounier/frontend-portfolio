/**
 * @format
 * Chat Input
 *
 * Text area + send button for composing chat messages.
 * Submits on Enter (Shift+Enter inserts a newline).
 * Disabled while the agent is processing.
 */

'use client'

import { useCallback, useRef, useState } from 'react'

// =============================================================================
// PROPS
// =============================================================================

interface ChatInputProps {
  /** Callback invoked when the user submits a prompt */
  readonly onSend: (prompt: string) => void
  /** Whether input should be disabled (agent is processing) */
  readonly isLoading: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum prompt length — mirrors API Gateway validation */
const MAX_PROMPT_LENGTH = 10_000

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Chat input area with send button.
 *
 * @param props - onSend callback and loading state
 * @returns Text area + send button JSX
 */
export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Handles form submission.
   */
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return

    onSend(trimmed)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, onSend])

  /**
   * Handles keyboard shortcuts: Enter to send, Shift+Enter for newline.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  /**
   * Auto-grows the textarea as the user types.
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= MAX_PROMPT_LENGTH) {
      setValue(newValue)
    }

    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const isDisabled = isLoading || value.trim().length === 0

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this portfolio…"
          disabled={isLoading}
          rows={1}
          className="
            flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-600
            bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm
            text-zinc-900 dark:text-zinc-100
            placeholder:text-zinc-400 dark:placeholder:text-zinc-500
            focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Chat message input"
        />
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="
            flex-shrink-0 rounded-xl bg-teal-600 hover:bg-teal-500
            disabled:bg-zinc-300 dark:disabled:bg-zinc-700
            disabled:cursor-not-allowed
            p-2.5 transition-colors
          "
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 ${isDisabled ? 'text-zinc-400 dark:text-zinc-500' : 'text-white'}`}
          >
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
      {value.length > MAX_PROMPT_LENGTH * 0.9 && (
        <p className="text-[10px] text-zinc-400 mt-1 text-right">
          {value.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}
        </p>
      )}
    </div>
  )
}
