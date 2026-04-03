'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { trackFormSubmission } from '@/lib/observability/analytics'

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

export function MusicNotifyForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      // Build the subscription URL from the API Gateway base URL
      // NEXT_PUBLIC_API_URL is injected at build time (e.g. https://…/api/)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || ''
      const subscribeUrl = baseUrl
        ? `${baseUrl}/subscriptions`
        : '/api/subscriptions' // local dev fallback

      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'music-notify',
        }),
      })

      if (response.ok) {
        setStatus('success')
        trackFormSubmission('music-notify', 'success')
        return
      }

      if (response.status === 409) {
        setStatus('already-subscribed')
        trackFormSubmission('music-notify', 'success')
        return
      }

      // 400 or other error
      const data: ApiErrorResponse = await response.json().catch(() => ({}))
      setErrorMessage(data.message || data.error || 'Please check your email and try again.')
      setStatus('error')
      trackFormSubmission('music-notify', 'error')
    } catch {
      setErrorMessage('Something went wrong. Please try again later.')
      setStatus('error')
      trackFormSubmission('music-notify', 'error')
    }
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-700/40">
        <h2 className="flex items-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
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
      <div className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-700/40">
        <h2 className="flex items-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          <CheckIcon className="h-6 w-6 flex-none" />
          <span className="ml-3">You&apos;re already subscribed</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong> is already on the list.
          You&apos;ll hear from me when the first track drops.
        </p>
      </div>
    )
  }

  // Default / error state — show form
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-100 p-8 dark:border-zinc-700/40"
    >
      <h2 className="flex items-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        <MailIcon className="h-6 w-6 flex-none" />
        <span className="ml-3">Get Notified</span>
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Be the first to know when the first track drops. I&apos;ll send you
        a single email with the playlist link—no spam, just music.
      </p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          aria-label="Email address"
          required
          disabled={status === 'submitting'}
          className="min-w-0 flex-auto appearance-none rounded-md border border-zinc-900/10 bg-white px-3 py-[calc(theme(spacing.2)-1px)] shadow-md shadow-zinc-800/5 placeholder:text-zinc-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:outline-none disabled:opacity-60 sm:text-sm dark:border-zinc-700 dark:bg-zinc-700/[0.15] dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/10"
        />
        <Button
          type="submit"
          className="flex-none"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <SpinnerIcon className="h-4 w-4" />
              Joining…
            </>
          ) : (
            'Notify Me'
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
