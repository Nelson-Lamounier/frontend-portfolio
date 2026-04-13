import { useState, useEffect, useCallback } from 'react'

/** Supported theme values. */
type Theme = 'dark' | 'light'

const STORAGE_KEY = 'start-admin-theme'
const DEFAULT_THEME: Theme = 'dark'

/**
 * Custom hook for managing the application theme.
 *
 * Reads the user's saved preference from `localStorage` on mount,
 * applies it by toggling the `.dark` class on `document.documentElement`,
 * and persists changes back to `localStorage` on toggle.
 *
 * Defaults to `'dark'` when no preference is stored — appropriate for
 * an internal admin console.
 *
 * @returns An object with the current `theme` and a `toggleTheme` callback.
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme } = useTheme()
 * return <button onClick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
 * ```
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)

  /** Apply the `.dark` class to `<html>` and persist to `localStorage`. */
  const applyTheme = useCallback((next: Theme) => {
    const root = document.documentElement
    if (next === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage may be unavailable in private browsing — silently ignore.
    }
    setTheme(next)
  }, [])

  /** On mount, read the stored preference (avoiding SSR mismatch). */
  useEffect(() => {
    let saved: Theme = DEFAULT_THEME
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'light' || raw === 'dark') {
        saved = raw
      }
    } catch {
      // Ignore storage errors.
    }
    applyTheme(saved)
  }, [applyTheme])

  /** Toggle between `'dark'` and `'light'`. */
  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, applyTheme])

  return { theme, toggleTheme }
}
