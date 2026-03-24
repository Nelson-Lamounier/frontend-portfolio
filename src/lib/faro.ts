/**
 * Grafana Faro SDK — Client-Side Real User Monitoring
 *
 * Initialises the Faro Web SDK to capture browser telemetry and forward it
 * to the Alloy collector. Captured telemetry includes:
 *
 * - **Web Vitals**: LCP, INP, CLS, TTFB, FCP
 * - **JavaScript Errors**: Uncaught exceptions, unhandled promise rejections
 * - **Console Logs**: console.error(), console.warn()
 * - **Client Spans**: Page navigations, fetch() calls (sent to Tempo via OTLP)
 *
 * Environment Variables:
 * - NEXT_PUBLIC_FARO_URL: Alloy Faro receiver URL (default: /faro/collect)
 * - NEXT_PUBLIC_FARO_ENABLED: Set to 'false' to disable (default: true)
 *
 * @see https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/
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
 * Initialise the Grafana Faro SDK for browser-side observability.
 *
 * Safe to call multiple times — returns the existing instance if already initialised.
 *
 * @returns The Faro instance, or null if disabled/failed
 */
export function initialiseFaro(): Faro | null {
  // Guard: already initialised
  if (faroInstance) {
    return faroInstance
  }

  // Guard: explicitly disabled
  if (process.env.NEXT_PUBLIC_FARO_ENABLED === 'false') {
    return null
  }

  // Guard: only run in browser
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const collectorUrl =
      process.env.NEXT_PUBLIC_FARO_URL ??
      'https://ops.nelsonlamounier.com/faro/collect'

    faroInstance = initializeFaro({
      url: collectorUrl,
      app: {
        name: 'portfolio-frontend',
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
        environment: process.env.NODE_ENV,
      },

      instrumentations: [
        // Built-in: Web Vitals, JS error capture, console interception,
        // session tracking, view tracking
        ...getWebInstrumentations({
          captureConsole: true,
          captureConsoleDisabledLevels: [], // Capture all levels
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

    console.log('[Faro] ✅ RUM initialised — sending telemetry to', collectorUrl)

    return faroInstance
  } catch (error) {
    // Non-fatal — app continues without RUM
    console.warn('[Faro] ⚠️ Failed to initialise RUM:', error)
    return null
  }
}
