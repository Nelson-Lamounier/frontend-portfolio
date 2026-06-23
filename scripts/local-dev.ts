#!/usr/bin/env node
/**
 * scripts/local-dev.ts — Site (Next.js) local image test harness
 *
 * Builds and runs the site Docker image locally so you can validate the
 * production build before deploy.
 *
 * Usage:
 *   npx tsx scripts/local-dev.ts              # Stop → build → start
 *   npx tsx scripts/local-dev.ts --no-rebuild # Use cached image (faster)
 *   npx tsx scripts/local-dev.ts --logs       # + tail logs after startup
 *   npx tsx scripts/local-dev.ts --stop       # Stop and remove the container
 *
 * Prerequisites:
 *   - Docker Desktop or colima running
 *   - apps/site/.env.local with Bedrock + DynamoDB vars
 */

import { spawnSync, spawn } from 'node:child_process'
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

// =============================================================================
// Config
// =============================================================================

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(__filename, '../..')

const SITE_IMAGE     = 'site:local'
const SITE_CONTAINER = 'nextjs-site-local'
const SITE_PORT      = 3000

// =============================================================================
// CLI flags
// =============================================================================

const argv       = process.argv.slice(2)
const NO_REBUILD = argv.includes('--no-rebuild')
const TAIL_LOGS  = argv.includes('--logs')
const STOP_ONLY  = argv.includes('--stop')

// =============================================================================
// Colours
// =============================================================================

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
}

const log = {
  info:  (msg: string) => console.log(`  ${C.blue}›${C.reset} ${msg}`),
  ok:    (msg: string) => console.log(`  ${C.green}✓${C.reset} ${msg}`),
  warn:  (msg: string) => console.log(`  ${C.yellow}⚠${C.reset}  ${msg}`),
  error: (msg: string) => console.error(`  ${C.red}✗${C.reset} ${msg}`),
  step:  (n: number, msg: string) =>
    console.log(`\n${C.bold}${C.cyan} ${n}. ${msg}${C.reset}`),
  cmd: (prog: string, args: string[]) =>
    console.log(`  ${C.dim}$ ${prog} ${args.join(' ')}${C.reset}`),
}

// =============================================================================
// Exec helpers
// =============================================================================

function run(prog: string, args: string[], opts: { cwd?: string } = {}): void {
  log.cmd(prog, args)
  const r = spawnSync(prog, args, { stdio: 'inherit', cwd: opts.cwd ?? REPO_ROOT })
  if (r.status !== 0) {
    throw new Error(`Failed (exit ${r.status ?? 'null'}): ${prog} ${args.join(' ')}`)
  }
}

function capture(prog: string, args: string[]): string {
  const r = spawnSync(prog, args, { stdio: 'pipe' })
  if (!r.stdout) return ''
  return r.stdout.toString().trim()
}

// =============================================================================
// Docker helpers
// =============================================================================

function containerExists(name: string): boolean {
  return capture('docker', ['ps', '-aq', '-f', `name=^${name}$`]).length > 0
}

function healthStatus(container: string): string {
  return capture('docker', ['inspect', '-f', '{{.State.Health.Status}}', container])
}

function waitHealthy(container: string, label: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const iv = setInterval(() => {
      const status = healthStatus(container)
      if (status === 'healthy') {
        clearInterval(iv)
        resolve()
        return
      }
      if (Date.now() >= deadline) {
        clearInterval(iv)
        const tail = capture('docker', ['logs', '--tail', '20', container])
        reject(new Error(
          `${label} did not become healthy within ${timeoutMs / 1000}s (status: "${status}")\n` +
          `Last logs:\n${tail}`,
        ))
      }
    }, 2_500)
  })
}

// =============================================================================
// Env file helpers
// =============================================================================

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const env: Record<string, string> = {}
  for (const raw of readFileSync(path, 'utf-8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^(["'])(.*)(\1)$/, '$2')
    env[key] = val
  }
  return env
}

function writeTempEnvFile(env: Record<string, string>): string {
  const path = join(tmpdir(), `site-local-${Date.now()}.env`)
  writeFileSync(path, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'), 'utf-8')
  return path
}

// =============================================================================
// Stop
// =============================================================================

function stopSite(stepNum: number): void {
  log.step(stepNum, 'Stop existing site container')
  if (containerExists(SITE_CONTAINER)) {
    run('docker', ['rm', '-f', SITE_CONTAINER])
    log.ok(`Removed ${SITE_CONTAINER}`)
  } else {
    log.info(`${SITE_CONTAINER} not running — skip`)
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log(`\n${C.bold}${C.magenta}┌──────────────────────────────────────────────────┐`)
  console.log(`│   site (Next.js) local image                    │`)
  console.log(`└──────────────────────────────────────────────────┘${C.reset}`)

  if (STOP_ONLY) {
    stopSite(0)
    log.ok('Done')
    return
  }

  // ── 1. Pre-flight ──────────────────────────────────────────────────────────
  log.step(1, 'Pre-flight checks')

  const siteEnvCount = Object.keys(parseEnvFile(join(REPO_ROOT, 'apps/site/.env.local'))).length
  if (siteEnvCount === 0) {
    log.warn('apps/site/.env.local not found — Bedrock chat and DynamoDB will fail')
  } else {
    log.ok(`Loaded ${siteEnvCount} vars from apps/site/.env.local`)
  }

  // ── 2. Stop existing container ────────────────────────────────────────────
  stopSite(2)

  // ── 3. Build image ─────────────────────────────────────────────────────────
  let stepN = 3
  if (!NO_REBUILD) {
    log.step(stepN++, 'Build site image')
    run('docker', [
      'build',
      '-f', join(REPO_ROOT, 'Dockerfile'),
      '-t', SITE_IMAGE,
      REPO_ROOT,
    ])
    log.ok(`Built ${SITE_IMAGE}`)
  } else {
    log.step(stepN++, 'Image build skipped (--no-rebuild)')
    if (!capture('docker', ['image', 'inspect', SITE_IMAGE, '-f', '{{.Id}}'])) {
      log.error(`Image ${SITE_IMAGE} not found — run without --no-rebuild first`)
      process.exit(1)
    }
    log.ok(`Cached: ${SITE_IMAGE}`)
  }

  // ── 4. Start container ─────────────────────────────────────────────────────
  log.step(stepN++, `Start site (port ${SITE_PORT})`)

  // Merge root .env.local first, then apps/site/.env.local (site-specific wins)
  const siteEnvRoot = parseEnvFile(join(REPO_ROOT, '.env.local'))
  const siteEnvApp  = parseEnvFile(join(REPO_ROOT, 'apps/site/.env.local'))
  const siteEnv     = { ...siteEnvRoot, ...siteEnvApp }

  const siteContainerEnv: Record<string, string> = {
    NODE_ENV: 'production',
    PORT: String(SITE_PORT),
    HOSTNAME: '0.0.0.0',
    OTEL_SDK_DISABLED: 'true',
    NEXT_TELEMETRY_DISABLED: '1',
    METRICS_ENABLED: 'true',
  }
  for (const [k, v] of Object.entries(siteEnv)) {
    if (!(k in siteContainerEnv)) siteContainerEnv[k] = v
  }

  const siteTmpEnv = writeTempEnvFile(siteContainerEnv)

  run('docker', [
    'run', '-d',
    '--name', SITE_CONTAINER,
    '-p', `${SITE_PORT}:${SITE_PORT}`,
    '--env-file', siteTmpEnv,
    SITE_IMAGE,
  ])
  try { unlinkSync(siteTmpEnv) } catch { /* ignore */ }
  log.ok(`${SITE_CONTAINER} started → http://localhost:${SITE_PORT}`)

  // ── 5. Health check ────────────────────────────────────────────────────────
  log.step(stepN++, 'Waiting for health check')

  try {
    await waitHealthy(SITE_CONTAINER, 'site', 90_000)
    log.ok(`site healthy → http://localhost:${SITE_PORT}`)
  } catch (err) {
    log.error((err as Error).message)
    process.exit(1)
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.green}┌──────────────────────────────────────────────────┐`)
  console.log(`│   ✓  site running                               │`)
  console.log(`└──────────────────────────────────────────────────┘${C.reset}`)
  console.log('')
  console.log(`  ${C.bold}site${C.reset}          http://localhost:${SITE_PORT}`)
  console.log('')
  console.log(`  ${C.dim}Logs:`)
  console.log(`    docker logs -f ${SITE_CONTAINER}`)
  console.log(`  Stop:`)
  console.log(`    npx tsx scripts/local-dev.ts --stop${C.reset}`)
  console.log('')

  // ── 7. Optional log tail ───────────────────────────────────────────────────
  if (TAIL_LOGS) {
    console.log(`${C.bold}${C.cyan} Tailing logs — Ctrl+C to detach${C.reset}\n`)

    const p = spawn('docker', ['logs', '-f', '--tail', '30', SITE_CONTAINER], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const prefix = (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n').filter(Boolean)) {
        process.stdout.write(`${C.yellow}[site]${C.reset} ${line}\n`)
      }
    }
    p.stdout?.on('data', prefix)
    p.stderr?.on('data', prefix)

    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        p.kill()
        console.log('\nDetached.')
        resolve()
      })
    })
  }
}

main().catch((err: unknown) => {
  log.error(String(err instanceof Error ? err.stack ?? err.message : err))
  process.exit(1)
})
