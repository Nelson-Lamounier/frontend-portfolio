---
title: In-memory sliding-window rate limiting
type: concept
tags: [nextjs, rate-limiting, security, api-routes]
sources:
  - apps/site/src/lib/rate-limiter.ts
  - apps/site/src/app/api/track-error/route.ts
created: 2026-07-05
updated: 2026-07-05
---

## Overview

The site's own public ingestion route — `/api/track-error`, which accepts
client-side error reports — is rate limited per IP by a zero-dependency,
in-memory sliding-window limiter
([rate-limiter.ts](../../apps/site/src/lib/rate-limiter.ts)). The file
header states the design constraint: it is built for "Next.js API routes
running on a single Node.js process", which fits this deployment (small
replica counts, no Redis on the write path).

## How it works

`createRateLimiter({ windowMs, maxRequests })` keeps a
`Map<key, timestamps[]>`. On `check(key)` it drops timestamps older than
the window, rejects when the survivor count reaches `maxRequests`, and
computes `retryAfterMs` from the oldest in-window timestamp — a true
sliding window, not fixed buckets, so a burst at a window boundary cannot
double the allowance. A 60-second `setInterval` sweep evicts expired
entries, and the interval is `unref()`d so it never keeps the Node
process alive.

```ts
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
const result = limiter.check(clientIp)
if (!result.allowed) return new Response('Too Many Requests', { status: 429 })
```

## Where it is applied

[track-error/route.ts](../../apps/site/src/app/api/track-error/route.ts)
instantiates a module-level singleton at 10 requests per 60 seconds per
IP, guarding the error-ingestion endpoint against report floods.
Engagement writes (likes/comments) are NOT limited here — their per-IP
limiting lives in the `public-api` BFF, which is why the site forwards
the original client IP as `x-forwarded-for` when proxying (see
[in-cluster BFF consumer](./in-cluster-bff-consumer.md)); without that
header every request would share the pod's IP and one noisy client would
exhaust everyone's budget.

## Tradeoffs

Process-local state means each replica enforces its own budget (the
effective global limit scales with replica count) and a pod restart
resets all windows. Both fit this endpoint's threat model — blunting
error-report floods, not enforcing a contract. The alternative,
Redis-backed limiting, would buy cross-replica accuracy at the cost of a
network hop per request and a new runtime dependency. Revisit if replica
counts grow or limits become externally meaningful.

## Related concepts

- [In-cluster BFF consumer architecture](./in-cluster-bff-consumer.md)

<!--
Evidence trail (auto-generated):
- Source: apps/site/src/lib/rate-limiter.ts (read on 2026-07-05)
- Source: apps/site/src/app/api/track-error/route.ts (read on 2026-07-05; singleton, 10 req / 60 s / IP)
-->
