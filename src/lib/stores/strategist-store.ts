/**
 * Strategist UI Store — Zustand
 *
 * Client-side UI state for the Job Strategist dashboard and detail pages.
 * Manages filter selections, active tab, and modal visibility.
 * Server data is NOT stored here — that lives in TanStack Query cache.
 *
 * @module
 */

import { create } from 'zustand'
import type { ApplicationStatus } from '@/lib/types/strategist.types'

// =============================================================================
// TYPES
// =============================================================================

/** Available detail page tabs */
export type StrategistDetailTab =
  | 'overview'
  | 'skills'
  | 'cover-letter'
  | 'interview-prep'

/** Strategist UI store state and actions */
interface StrategistUIStore {
  // ── State ─────────────────────────────────────────────────────────────
  /** Active status filter on the applications dashboard */
  activeStatusFilter: ApplicationStatus | 'all'
  /** Active tab on the detail page */
  activeDetailTab: StrategistDetailTab
  /** Whether the "New Analysis" modal is open */
  isNewAnalysisOpen: boolean
  /** Search query for company name filtering */
  searchQuery: string

  // ── Actions ───────────────────────────────────────────────────────────
  /** Sets the active status filter */
  setStatusFilter: (status: ApplicationStatus | 'all') => void
  /** Sets the active detail tab */
  setDetailTab: (tab: StrategistDetailTab) => void
  /** Toggles the "New Analysis" modal */
  toggleNewAnalysis: () => void
  /** Opens the "New Analysis" modal */
  openNewAnalysis: () => void
  /** Closes the "New Analysis" modal */
  closeNewAnalysis: () => void
  /** Sets the search query */
  setSearchQuery: (query: string) => void
  /** Resets all UI state to defaults */
  reset: () => void
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const INITIAL_STATE = {
  activeStatusFilter: 'all' as const,
  activeDetailTab: 'overview' as const,
  isNewAnalysisOpen: false,
  searchQuery: '',
}

// =============================================================================
// STORE
// =============================================================================

/**
 * Zustand store for strategist UI state.
 * Manages filters, tabs, modals, and search — NOT server data.
 */
export const useStrategistStore = create<StrategistUIStore>((set) => ({
  ...INITIAL_STATE,

  setStatusFilter: (status) => set({ activeStatusFilter: status }),

  setDetailTab: (tab) => set({ activeDetailTab: tab }),

  toggleNewAnalysis: () =>
    set((state) => ({ isNewAnalysisOpen: !state.isNewAnalysisOpen })),

  openNewAnalysis: () => set({ isNewAnalysisOpen: true }),

  closeNewAnalysis: () => set({ isNewAnalysisOpen: false }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  reset: () => set(INITIAL_STATE),
}))
