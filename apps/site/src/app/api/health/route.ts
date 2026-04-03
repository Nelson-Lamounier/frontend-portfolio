/** @format */

/**
 * GET /api/health
 *
 * Health check endpoint for load balancers and monitoring.
 * Returns only a minimal, non-sensitive response — no server
 * internals (memory, uptime, environment) are exposed.
 */

import { NextResponse } from 'next/server'

/**
 * Returns a simple health status for monitoring and load balancer probes.
 *
 * @returns JSON `{ status: "healthy", timestamp: "..." }`
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
