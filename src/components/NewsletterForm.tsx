'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { trackFormSubmission } from '@/lib/analytics'

// ========================================
// Types
// ========================================

type FormStatus = 'idle' | 'submitting' | 'success' | 'already-subscribed' | 'error'

interface ApiErrorResponse {
  message?: string
  error?: string
}

// ========================================
// Icons
// ========================================

function MailIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2.75 7.75a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5.75a3 3 0 0 1-3-3v-8.5Z"
        className="fill-zinc-100 stroke-zinc-400 dark:fill-zinc-100/10 dark:stroke-zinc-500"
      />
      <path
        d="m4 6 6.024 5.479a2.915 2.915 0 0 0 3.952 0L20 6"
        className="stroke-zinc-400 dark:stroke-zinc-500"
      />
    </svg>
  )
}

function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 12.75 11.25 15 15 9.75"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-teal-500 dark:stroke-teal-400"
      />
      <circle
        cx="12"
        cy="12"
        r="9.25"
        strokeWidth="1.5"
        className="stroke-teal-500 dark:stroke-teal-400"
      />
    </svg>
  )
}

function SpinnerIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle
        cx="12"
        cy="12"
        r="10"
        strokeWidth="2"
        className="stroke-zinc-300 dark:stroke-zinc-600"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-spin origin-center stroke-zinc-800 dark:stroke-zinc-100"
      />
    </svg>
  )
}

// ========================================
// Component
// ========================================

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'newsletter-form',
        }),
      })

      if (response.ok) {
        setStatus('success')
        trackFormSubmission('newsletter', 'success')
        return
      }

      if (response.status === 409) {
        setStatus('already-subscribed')
        trackFormSubmission('newsletter', 'success') // Not an error from UX perspective
        return
      }

      // 400 or other error
      const data: ApiErrorResponse = await response.json().catch(() => ({}))
      setErrorMessage(data.message || data.error || 'Please check your email and try again.')
      setStatus('error')
      trackFormSubmission('newsletter', 'error')
    } catch {
      setErrorMessage('Something went wrong. Please try again later.')
      setStatus('error')
      trackFormSubmission('newsletter', 'error')
    }
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
        <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <CheckIcon className="h-6 w-6 flex-none" />
          <span className="ml-3">Check your inbox</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ve sent a verification email to <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong>.
          Please click the link to confirm your subscription. The link expires in 48 hours.
        </p>
      </div>
    )
  }

  // Already subscribed state
  if (status === 'already-subscribed') {
    return (
      <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
        <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <CheckIcon className="h-6 w-6 flex-none" />
          <span className="ml-3">You&apos;re already subscribed</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong> is already on the list.
          You&apos;ll hear from me when I publish something new.
        </p>
      </div>
    )
  }

  // Default / error state — show form
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40"
    >
      <h2 className="flex text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        <MailIcon className="h-6 w-6 flex-none" />
        <span className="ml-3">Stay up to date</span>
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Get notified when I publish something new, and unsubscribe at any time.
      </p>
      <div className="mt-6 flex items-center">
        <span className="flex min-w-0 flex-auto p-px">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            required
            disabled={status === 'submitting'}
            className="w-full appearance-none rounded-[calc(var(--radius-md)-1px)] bg-white px-3 py-[calc(--spacing(2)-1px)] shadow-md shadow-zinc-800/5 outline outline-zinc-900/10 placeholder:text-zinc-400 focus:ring-4 focus:ring-teal-500/10 focus:outline-teal-500 disabled:opacity-60 sm:text-sm dark:bg-zinc-700/15 dark:text-zinc-200 dark:outline-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-teal-400/10 dark:focus:outline-teal-400"
          />
        </span>
        <Button
          type="submit"
          className="ml-4 flex-none"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <SpinnerIcon className="h-4 w-4" />
              Joining…
            </>
          ) : (
            'Join'
          )}
        </Button>
      </div>
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </form>
  )
}
