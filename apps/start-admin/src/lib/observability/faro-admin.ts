/**
 * @format
 * Grafana Faro RUM wrapper for the admin dashboard.
 *
 * Thin wrapper around the shared `initialiseFaro()` module that overrides
 * the app name and reads Vite-style environment variables (`VITE_FARO_*`)
 * instead of Next.js-style (`NEXT_PUBLIC_*`).
 *
 * @see packages/shared/src/lib/observability/faro.ts
 */

import {
  initializeFaro,
  getWebInstrumentations,
  type Faro,
} from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

/** Singleton Faro instance — prevents double-initialisation in React strict mode */
let faroInstance: Faro | null = null

/**
 * Initialise the Grafana Faro SDK for the admin dashboard.
 *
 * Safe to call multiple times — returns the existing instance if already initialised.
 * Uses `import.meta.env.VITE_FARO_*` for Vite/TanStack Start compatibility.
 *
 * @returns The Faro instance, or null if disabled/SSR
 */
export function initialiseFaroAdmin(): Faro | null {
  if (faroInstance) {
    return faroInstance
  }

  // Guard: explicitly disabled
  if (import.meta.env.VITE_FARO_ENABLED === 'false') {
    return null
  }

  // Guard: only run in browser
  if (globalThis.window === undefined) {
    return null
  }

  try {
    const collectorUrl =
      import.meta.env.VITE_FARO_URL ??
      'https://ops.nelsonlamounier.com/faro/collect'

    faroInstance = initializeFaro({
      url: collectorUrl,
      app: {
        name: 'portfolio-admin',
        version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
        environment: import.meta.env.MODE,
      },

      instrumentations: [
        // Built-in: Web Vitals, JS error capture, console interception,
        // session tracking, view tracking
        ...getWebInstrumentations({
          captureConsole: true,
        }),

        // Client-side tracing → forwarded to Tempo via Alloy OTLP
        new TracingInstrumentation({
          instrumentationOptions: {
            // Propagate trace context to same-origin API calls
            propagateTraceHeaderCorsUrls: [
              /^https:\/\/.*\.nelsonlamounier\.com/,
            ],
          },
        }),
      ],
    })

    // console.log('[Faro] ✅ Admin RUM initialised — sending telemetry to', collectorUrl)

    return faroInstance
  } catch {
    // Non-fatal — app continues without RUM
    // console.warn('[Faro] ⚠️ Failed to initialise admin RUM:', error)
    return null
  }
}
