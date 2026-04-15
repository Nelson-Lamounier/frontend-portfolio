import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

/** Supported theme values. */
export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'start-admin-theme'
const DEFAULT_THEME: Theme = 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
})

/**
 * Reads the stored theme from localStorage synchronously.
 * Returns DEFAULT_THEME on the server (no `window`) or when no preference is stored.
 * Called as a lazy `useState` initializer so the client's first render already
 * has the correct theme — no two-render flicker.
 */
function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return DEFAULT_THEME
}

/**
 * Applies `next` as the active theme by toggling `.dark` on `<html>`
 * and persisting to `localStorage`.
 */
function applyThemeToDom(next: Theme): void {
  const root = document.documentElement
  if (next === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Provides the application theme to all descendant components.
 *
 * - Reads the stored preference from `localStorage` synchronously during
 *   client hydration so the React state matches the DOM from the very first
 *   render (eliminates the two-render flicker caused by `useEffect` reads).
 * - The anti-flash `<script>` in `__root.tsx` handles the CSS paint before
 *   React hydrates; this provider keeps React state in sync afterwards.
 * - Persists preference changes to `localStorage` and syncs the `.dark` class
 *   on `document.documentElement`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer: on the client this reads localStorage synchronously,
  // so state is correct from the first render — no extra render cycle needed.
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  const applyTheme = useCallback((next: Theme) => {
    applyThemeToDom(next)
    setTheme(next)
  }, [])

  // On mount, re-sync the DOM class with the React state.
  // Handles the edge case where the anti-flash script and React disagree
  // (e.g. CDN/HTTP2 serving CSS before the inline script executes).
  useEffect(() => {
    applyThemeToDom(theme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs only once on mount

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, applyTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Returns the current theme and toggle callback from the nearest `ThemeProvider`.
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme } = useTheme()
 * ```
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
