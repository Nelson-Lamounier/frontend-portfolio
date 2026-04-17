#!/usr/bin/env node
/**
 * scripts/local-dev.ts — Frontend local image test harness
 *
 * Builds and runs the two frontend Docker images (start-admin + site) and
 * wires start-admin to the already-running admin-api container so it can
 * reach it via Docker DNS — replicating K8s pod-to-pod networking.
 *
 * Admin-api lifecycle is NOT managed here.
 * Use `just admin-api-up` in the cdk-monitoring repo first.
 *
 * Network wiring:
 *   K8s production:  start-admin → http://admin-api.admin-api:3002
 *   Local (this):    start-admin → http://admin-api:3002  (Docker DNS alias)
 *   Achieved via:    docker network connect --alias admin-api
 *
 * Usage:
 *   npx tsx scripts/local-dev.ts              # Stop → build → start both
 *   npx tsx scripts/local-dev.ts --no-rebuild  # Use cached images (faster)
 *   npx tsx scripts/local-dev.ts --logs        # + tail combined logs after startup
 *   npx tsx scripts/local-dev.ts --stop        # Stop and remove both containers
 *   npx tsx scripts/local-dev.ts --admin-only  # Only start-admin (skip site)
 *   npx tsx scripts/local-dev.ts --site-only   # Only site (skip start-admin)
 *
 * Prerequisites:
 *   - Docker Desktop or colima running
 *   - admin-api container already running locally
 *     (run `just admin-api-up` in cdk-monitoring repo)
 *   - apps/start-admin/.env.local with Cognito + other vars
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

// Docker image/container names
const START_ADMIN_IMAGE     = 'start-admin:local'
const START_ADMIN_CONTAINER = 'start-admin-local'
const START_ADMIN_PORT      = 5001

const SITE_IMAGE     = 'site:local'
const SITE_CONTAINER = 'nextjs-site-local'
const SITE_PORT      = 3000

// Shared network — start-admin uses this to reach admin-api
const NETWORK_NAME = 'local-cluster'

// admin-api container (managed by cdk-monitoring, already running)
const ADMIN_API_CONTAINER = 'admin-api-admin-api-1'
const ADMIN_API_ALIAS     = 'admin-api'
const ADMIN_API_PORT      = 3002

const HOME_DIR    = process.env['HOME'] ?? '/root'
const AWS_PROFILE = process.env['AWS_PROFILE'] ?? 'dev-account'

// =============================================================================
// CLI flags
// =============================================================================

const argv       = process.argv.slice(2)
const NO_REBUILD = argv.includes('--no-rebuild')
const TAIL_LOGS  = argv.includes('--logs')
const STOP_ONLY  = argv.includes('--stop')
const ADMIN_ONLY = argv.includes('--admin-only')
const SITE_ONLY  = argv.includes('--site-only')

const RUN_ADMIN = !SITE_ONLY
const RUN_SITE  = !ADMIN_ONLY

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
// Exec helpers — explicit args arrays, no shell string interpolation
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

function containerRunning(name: string): boolean {
  return capture('docker', ['inspect', '-f', '{{.State.Running}}', name]) === 'true'
}

function networkExists(name: string): boolean {
  return capture('docker', ['network', 'ls', '-q', '-f', `name=^${name}$`]).length > 0
}

function connectedToNetwork(container: string, network: string): boolean {
  const nets = capture('docker', [
    'inspect', container,
    '-f', '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}',
  ])
  return nets.split(/\s+/).includes(network)
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
  const path = join(tmpdir(), `frontend-local-${Date.now()}.env`)
  writeFileSync(path, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'), 'utf-8')
  return path
}

// =============================================================================
// Stop
// =============================================================================

function stopFrontend(stepNum: number): void {
  log.step(stepNum, 'Stop existing frontend containers')

  for (const name of [START_ADMIN_CONTAINER, SITE_CONTAINER]) {
    if (containerExists(name)) {
      run('docker', ['rm', '-f', name])
      log.ok(`Removed ${name}`)
    } else {
      log.info(`${name} not running — skip`)
    }
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log(`\n${C.bold}${C.magenta}┌──────────────────────────────────────────────────┐`)
  console.log(`│   Frontend local images — start-admin + site    │`)
  console.log(`└──────────────────────────────────────────────────┘${C.reset}`)

  if (STOP_ONLY) {
    stopFrontend(0)
    log.ok('Done')
    return
  }

  // ── 1. Pre-flight ──────────────────────────────────────────────────────────
  log.step(1, 'Pre-flight checks')

  // Verify admin-api is running (required by start-admin)
  if (RUN_ADMIN) {
    if (!containerRunning(ADMIN_API_CONTAINER)) {
      log.warn(`admin-api container "${ADMIN_API_CONTAINER}" is not running.`)
      log.warn('Run `just admin-api-up` in the cdk-monitoring repo first.')
      log.warn('Continuing — start-admin will start but API calls will fail.')
    } else {
      log.ok(`admin-api running (${ADMIN_API_CONTAINER})`)
    }
  }

  const awsDir = `${HOME_DIR}/.aws`
  if (existsSync(awsDir)) {
    log.ok('~/.aws found — will mount read-only into start-admin')
  } else {
    log.warn('~/.aws not found — AWS SDK calls will fail inside start-admin')
  }

  const startAdminEnvPath = join(REPO_ROOT, 'apps/start-admin/.env.local')
  const startAdminEnv = parseEnvFile(startAdminEnvPath)
  if (RUN_ADMIN) {
    if (Object.keys(startAdminEnv).length === 0) {
      log.warn('apps/start-admin/.env.local not found — Cognito auth will fail')
    } else {
      log.ok(`Loaded ${Object.keys(startAdminEnv).length} vars from apps/start-admin/.env.local`)
    }
  }

  if (RUN_SITE) {
    const siteEnvCount = Object.keys(parseEnvFile(join(REPO_ROOT, 'apps/site/.env.local'))).length
    if (siteEnvCount === 0) {
      log.warn('apps/site/.env.local not found — Bedrock chat and DynamoDB will fail')
    } else {
      log.ok(`Loaded ${siteEnvCount} vars from apps/site/.env.local`)
    }
  }

  // ── 2. Stop existing frontend containers ──────────────────────────────────
  stopFrontend(2)

  // ── 3. Ensure shared network ───────────────────────────────────────────────
  if (RUN_ADMIN) {
    log.step(3, `Ensure network: ${C.cyan}${NETWORK_NAME}${C.reset}`)
    if (!networkExists(NETWORK_NAME)) {
      run('docker', ['network', 'create', NETWORK_NAME])
      log.ok(`Created ${NETWORK_NAME}`)
    } else {
      log.ok(`Network ${NETWORK_NAME} already exists`)
    }

    // Connect the running admin-api to local-cluster with alias "admin-api"
    // so start-admin can resolve it at http://admin-api:3002 via Docker DNS.
    if (containerRunning(ADMIN_API_CONTAINER)) {
      if (!connectedToNetwork(ADMIN_API_CONTAINER, NETWORK_NAME)) {
        run('docker', [
          'network', 'connect',
          '--alias', ADMIN_API_ALIAS,
          NETWORK_NAME,
          ADMIN_API_CONTAINER,
        ])
        log.ok(`admin-api joined ${NETWORK_NAME} as alias "${ADMIN_API_ALIAS}"`)
      } else {
        log.ok(`admin-api already on ${NETWORK_NAME}`)
      }
    }
  }

  // ── 4. Build images ────────────────────────────────────────────────────────
  let stepN = 4

  if (!NO_REBUILD) {
    if (RUN_ADMIN) {
      log.step(stepN++, 'Build start-admin image')
      run('docker', [
        'build',
        '-f', join(REPO_ROOT, 'apps/start-admin/Dockerfile'),
        '-t', START_ADMIN_IMAGE,
        REPO_ROOT,
      ])
      log.ok(`Built ${START_ADMIN_IMAGE}`)
    }

    if (RUN_SITE) {
      log.step(stepN++, 'Build site image')
      run('docker', [
        'build',
        '-f', join(REPO_ROOT, 'Dockerfile'),
        '-t', SITE_IMAGE,
        REPO_ROOT,
      ])
      log.ok(`Built ${SITE_IMAGE}`)
    }
  } else {
    log.step(stepN++, 'Image builds skipped (--no-rebuild)')
    for (const [img, flag] of [[START_ADMIN_IMAGE, RUN_ADMIN], [SITE_IMAGE, RUN_SITE]] as const) {
      if (!flag) continue
      if (!capture('docker', ['image', 'inspect', img, '-f', '{{.Id}}'])) {
        log.error(`Image ${img} not found — run without --no-rebuild first`)
        process.exit(1)
      }
      log.ok(`Cached: ${img}`)
    }
  }

  // ── 5. Start site ──────────────────────────────────────────────────────────
  if (RUN_SITE) {
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
    // Merge .env.local vars (BEDROCK_AGENT_API_URL, DYNAMODB_TABLE_NAME, etc.)
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
  }

  // ── 6. Start start-admin ───────────────────────────────────────────────────
  if (RUN_ADMIN) {
    log.step(stepN++, `Start start-admin (port ${START_ADMIN_PORT})`)

    const containerEnv: Record<string, string> = {
      NODE_ENV: 'production',
      PORT: String(START_ADMIN_PORT),
      HOST: '0.0.0.0',
      // Pod-to-pod URL: Docker DNS resolves "admin-api" via local-cluster network
      // mirrors K8s:  http://admin-api.admin-api:3002
      ADMIN_API_URL: `http://${ADMIN_API_ALIAS}:${ADMIN_API_PORT}`,
      AWS_PROFILE,
      AWS_DEFAULT_REGION: startAdminEnv['AWS_DEFAULT_REGION'] ?? 'eu-west-1',
      AWS_REGION:         startAdminEnv['AWS_REGION']         ?? 'eu-west-1',
      VITE_APP_URL: `http://localhost:${START_ADMIN_PORT}`,
      OTEL_SDK_DISABLED: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
    }
    // Merge remaining vars from .env.local
    const LOCKED = new Set(Object.keys(containerEnv))
    for (const [k, v] of Object.entries(startAdminEnv)) {
      if (!LOCKED.has(k)) containerEnv[k] = v
    }

    log.ok(`ADMIN_API_URL → ${containerEnv['ADMIN_API_URL']}`)

    const tmpEnv = writeTempEnvFile(containerEnv)

    const dockerArgs: string[] = [
      'run', '-d',
      '--name', START_ADMIN_CONTAINER,
      '--network', NETWORK_NAME,
      '-p', `${START_ADMIN_PORT}:${START_ADMIN_PORT}`,
      '--env-file', tmpEnv,
    ]
    if (existsSync(awsDir)) {
      dockerArgs.push('-v', `${awsDir}:/home/startadmin/.aws:ro`)
    }
    dockerArgs.push(START_ADMIN_IMAGE)

    run('docker', dockerArgs)
    try { unlinkSync(tmpEnv) } catch { /* ignore */ }
    log.ok(`${START_ADMIN_CONTAINER} started → http://localhost:${START_ADMIN_PORT}/admin/`)
  }

  // ── 7. Health checks ───────────────────────────────────────────────────────
  log.step(stepN++, 'Waiting for health checks')

  const checks: Promise<void>[] = []

  if (RUN_SITE) {
    checks.push(
      waitHealthy(SITE_CONTAINER, 'site', 90_000)
        .then(() => log.ok(`site healthy → http://localhost:${SITE_PORT}`)),
    )
  }
  if (RUN_ADMIN) {
    checks.push(
      waitHealthy(START_ADMIN_CONTAINER, 'start-admin', 120_000)
        .then(() => log.ok(`start-admin healthy → http://localhost:${START_ADMIN_PORT}/admin/`)),
    )
  }

  try {
    await Promise.all(checks)
  } catch (err) {
    log.error((err as Error).message)
    process.exit(1)
  }

  // ── 8. Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.green}┌──────────────────────────────────────────────────┐`)
  console.log(`│   ✓  Frontend images running                    │`)
  console.log(`└──────────────────────────────────────────────────┘${C.reset}`)
  console.log('')
  if (RUN_ADMIN) {
    console.log(`  ${C.bold}start-admin${C.reset}   http://localhost:${START_ADMIN_PORT}/admin/`)
    console.log(`               → admin-api:${ADMIN_API_PORT}  (Docker DNS on ${NETWORK_NAME})`)
  }
  if (RUN_SITE) {
    console.log(`  ${C.bold}site${C.reset}          http://localhost:${SITE_PORT}`)
  }
  console.log('')
  console.log(`  ${C.dim}Logs:`)
  if (RUN_ADMIN) console.log(`    docker logs -f ${START_ADMIN_CONTAINER}`)
  if (RUN_SITE)  console.log(`    docker logs -f ${SITE_CONTAINER}`)
  console.log(`  Stop:`)
  console.log(`    npx tsx scripts/local-dev.ts --stop${C.reset}`)
  console.log('')

  // ── 9. Optional log tail ───────────────────────────────────────────────────
  if (TAIL_LOGS) {
    console.log(`${C.bold}${C.cyan} Tailing combined logs — Ctrl+C to detach${C.reset}\n`)

    const procs: ReturnType<typeof spawn>[] = []

    if (RUN_ADMIN) {
      const p = spawn('docker', ['logs', '-f', '--tail', '30', START_ADMIN_CONTAINER], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const prefix = (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n').filter(Boolean)) {
          process.stdout.write(`${C.cyan}[start-admin]${C.reset} ${line}\n`)
        }
      }
      p.stdout?.on('data', prefix)
      p.stderr?.on('data', prefix)
      procs.push(p)
    }

    if (RUN_SITE) {
      const p = spawn('docker', ['logs', '-f', '--tail', '30', SITE_CONTAINER], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const prefix = (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n').filter(Boolean)) {
          process.stdout.write(`${C.yellow}[site        ]${C.reset} ${line}\n`)
        }
      }
      p.stdout?.on('data', prefix)
      p.stderr?.on('data', prefix)
      procs.push(p)
    }

    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        procs.forEach((p) => p.kill())
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
