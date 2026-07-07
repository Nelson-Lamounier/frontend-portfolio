---
title: Article edits not visible on the site (ISR staleness)
type: troubleshooting
tags: [nextjs, isr, caching, rds, operations]
sources:
  - apps/site/src/app/(site)/articles/[slug]/page.tsx
  - apps/site/src/lib/articles/public-api-articles.ts
  - apps/site/src/app/api/revalidate/route.ts
created: 2026-07-05
updated: 2026-07-05
---

## Symptom

An article was edited (directly in RDS, or by the pipeline) and the site
still shows the old content — or the article "disappears": the list page
omits it and its detail URL returns 404 — while the BFF API returns the
correct, current data. Observed live on 2026-07-05 after in-place
`content_md` edits: `GET /api/articles` listed both articles, yet the
rendered list page contained neither and one detail page served a 404.

## Root cause

Two stacked caches plus stale-while-revalidate semantics, and no
invalidation signal from the database to the site:

- The article pages use ISR with a **1-hour** TTL
  (`export const revalidate = 3600` in
  [articles/[slug]/page.tsx](<../../apps/site/src/app/(site)/articles/[slug]/page.tsx>)
  and the listing page).
- The data-layer fetch adds its own **5-minute** Next data-cache entry
  (`REVALIDATE_SECONDS = 300` in
  [public-api-articles.ts](../../apps/site/src/lib/articles/public-api-articles.ts)).
- Next serves the **stale copy while revalidating in the background**: the
  first request after a TTL expiry still gets the old page and only
  *triggers* the refresh; the next request gets the fresh one. A cached
  `notFound()` behaves the same way, which is why a 404 can persist after
  the underlying row became servable.

Editing rows in RDS does not notify the site. Nothing is broken — the
pages refresh lazily, up to an hour plus one request later.

## How to diagnose

Confirm the layers disagree, then watch the refresh happen:

```bash
# 1. Upstream truth — the BFF (in-cluster; use the public API host or port-forward)
curl -s https://<api-host>/api/articles | jq '.items[].slug'

# 2. Rendered page — request twice; the first hit triggers background revalidation
curl -s -o /dev/null -w '%{http_code}\n' https://<site>/articles/<slug>
sleep 3
curl -s -o /dev/null -w '%{http_code}\n' https://<site>/articles/<slug>
```

If the BFF shows the new content and the second-or-third page request
converges, this is ISR staleness, not a data problem. If the BFF itself is
wrong, the problem is upstream — stop here and debug the producer.

## How to fix

For a one-off edit, request the affected pages a couple of times (as
above) or simply wait out the TTL. For an immediate, targeted purge, use
the on-demand revalidation endpoint
([api/revalidate/route.ts](../../apps/site/src/app/api/revalidate/route.ts)),
which is secret-gated and purges the listing plus an optional slug:

```bash
curl -X POST https://<site>/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"secret":"<REVALIDATION_SECRET>","slug":"<slug>"}'
```

## How to prevent

Any process that writes article content outside the pipeline (manual RDS
edits, migrations) should end by calling `/api/revalidate` for the touched
slugs. The publish pipeline already has this hook available; wiring
`persistArticle` (ai-applications) to call it after publish would make
edits visible immediately instead of within the hour. Until then, treat
"UI behind by ≤1 hour + one request" as designed behaviour, not an
incident.

<!--
Evidence trail (auto-generated):
- Source: apps/site/src/app/(site)/articles/[slug]/page.tsx (read on 2026-07-05; revalidate = 3600)
- Source: apps/site/src/lib/articles/public-api-articles.ts (read on 2026-07-05; REVALIDATE_SECONDS = 300)
- Source: apps/site/src/app/api/revalidate/route.ts (read on 2026-07-05)
- Incident: 2026-07-05 in-place RDS content_md edits; list page stale and one detail 404 while GET /api/articles was correct; converged after repeated requests
-->
