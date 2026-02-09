'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'

// ========================================
// Constants
// ========================================

const CONSENT_KEY = 'cookie-consent'
type ConsentStatus = 'accepted' | 'declined' | null

// ========================================
// CookieConsent Component
// ========================================

/**
 * Cookie Consent Banner + Google Analytics Gate
 *
 * Manages user consent for non-essential cookies (Google Analytics).
 * Consent is stored in localStorage — no server-side storage needed.
 *
 * Renders:
 * - A bottom banner on first visit (no consent recorded)
 * - <GoogleAnalytics /> only when consent is 'accepted'
 * - Nothing if consent was 'declined' (GA never loads)
 */
export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Read stored consent on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentStatus
    if (stored === 'accepted' || stored === 'declined') {
      setConsent(stored)
    } else {
      // No consent recorded — show the banner after a brief delay
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setConsent('accepted')
    setIsVisible(false)
  }, [])

  const handleDecline = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setConsent('declined')
    setIsVisible(false)
  }, [])

  return (
    <>
      {/* Only load GA when consent is explicitly accepted */}
      {consent === 'accepted' && <GoogleAnalytics />}

      {/* Cookie consent banner */}
      {isVisible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
        >
          <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900/95">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  This site uses cookies for analytics (Google Analytics) to understand how visitors interact with the content.
                  These are{' '}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    non-essential tracking cookies
                  </span>{' '}
                  that require your consent.
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={handleDecline}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  Accept Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ========================================
// Manage Cookies Button (for Footer)
// ========================================

/**
 * Small link/button to re-open the cookie consent banner.
 * Add this to the footer so users can change their preference.
 */
export function ManageCookiesButton() {
  const handleClick = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY)
    // Force a page reload to re-trigger the consent banner
    window.location.reload()
  }, [])

  return (
    <button
      onClick={handleClick}
      className="text-sm text-zinc-400 transition hover:text-teal-500 dark:text-zinc-500 dark:hover:text-teal-400"
    >
      Manage Cookies
    </button>
  )
}
