---
title: BFF migration — architecture decisions & gap analysis (archived)
type: history
status: superseded
tags: [backend-for-frontend, migration, admin-api, decision-record, archived]
created: 2026-04-28
updated: 2026-07-04
---

> [!NOTE]
> **Archived decision record — partly superseded.** This is the pre-migration
> gap analysis for moving the admin/producer stack (`start-admin` → `admin-api`)
> off direct AWS SDK access and behind the BFF. It describes the **producer**
> side (a sibling repo, TanStack `createServerFn` handlers), not this consumer
> site. It is kept for provenance; the consumer-side outcome is documented in
> [in-cluster BFF consumer architecture](../concepts/in-cluster-bff-consumer.md).
> Treat the phase plan below as historical intent, not current state.

## Decision 1: Auth Forwarding

### Answer: admin-api validates the JWT itself (CONFIRMED — already implemented)

The code in `auth-guard.ts` is definitive:

```typescript
// start-admin: auth-guard.ts
export async function requireAuth(): Promise<AuthUser> {
  const token = getCookie('__session')     // ← reads Cognito id_token from HTTP-only cookie
  const payload = await verifyCognitoJwt(token)   // ← JWKS validation against Cognito
  return { id: payload.sub, email: payload.email }
}
```

The `__session` cookie stores the Cognito `id_token` (set in `handleAuthCallbackFn`).
The `admin-api` middleware also validates JWTs:

```typescript
// admin-api: middleware/auth.ts
app.use('/api/admin/*', cognitoJwtAuth(...))   // ← same JWKS validation
```

**Migration pattern**: Every `createServerFn` handler calls `requireAuth()` locally,
then must forward the same token to admin-api:

```typescript
export const getArticlesFn = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const token = getCookie('__session')   // read cookie (still local)
    const res = await fetch(`${ADMIN_API_URL}/api/admin/articles`, {
      headers: { Authorization: `Bearer ${token}` },   // forward to BFF
    })
    return res.json()
  })
```

`requireAuth()` can be **removed** from individual handlers — the BFF enforces auth on
every `/api/admin/*` route. If desired, keep it as a local pre-flight guard for fail-fast
UX (avoids the network round-trip before rejecting unauthenticated requests).

> [!TIP]
> **Recommended**: Keep a lightweight local token presence check (not full JWKS
> verification) to redirect to login immediately. Full validation happens at the BFF.

---

## Decision 2: Binary Upload Path

### Answer: The current pattern is NOT compatible with admin-api. A match is required.

**Current start-admin `upload.ts`**:
```
Browser → FormData → uploadMediaFn (createServerFn) → PutObjectCommand → S3
```
The file binary travels: `browser → start-admin pod → S3`. The pod buffers the entire
file in memory (`Buffer.from(await file.arrayBuffer())`).

**admin-api `assets.ts`** implements the presign pattern:
```
frontend calls POST /api/admin/assets/presign → receives { url, key }
frontend then PUT {url} → S3 directly (browser-to-S3, no pod buffering)
```

### The gap: admin-api does NOT have a direct upload endpoint

`admin-api/assets.ts` only has:
- `POST /api/admin/assets/presign` — generates a signed PUT URL
- `DELETE /api/admin/assets/:key` — deletes an asset

**There is no multipart/FormData upload proxy endpoint in admin-api.**

### Decision required: Which path to use?

**Option A — Migrate start-admin to presign pattern (recommended)**
- Change `uploadMediaFn` in start-admin to call `POST /api/admin/assets/presign`, then
  upload directly from the browser.
- Pros: No pod memory pressure; aligns with admin-api design intent.
- Cons: ~20 lines of change in the upload component + S3 CORS must allow browser PUT.

**Option B — Add a proxy upload endpoint to admin-api**
- Add `POST /api/admin/assets/upload` that accepts FormData and pipes to S3.
- Pros: Zero change in start-admin upload flow.
- Cons: Pod buffers binary in memory (defeats the purpose of the BFF design).

> [!IMPORTANT]
> **Recommendation: Option A**. The admin-api `assets.ts` docstring explicitly states
> the presign design was chosen to "avoid routing binary content through the Kubernetes
> pod". Option A also requires S3 CORS to allow `PUT` from `admin.nelsonlamounier.com`.

**Also note**: `saveArticleContentFn` in `articles.ts` calls `putArticleContent(contentRef, data.content)`
which writes MDX body to S3. This must also move — either via a new `PUT /api/admin/articles/:slug/content`
route on admin-api, or by keeping the S3 write in the server function (MDX is text, not binary).

---

## Decision 3: Bedrock Chatbot (BEDROCK_AGENT_API_URL)

### Answer: Keep as-is in start-admin. Do NOT proxy through admin-api.

**Evidence from `finops.ts`**: The `BEDROCK_AGENT_API_URL` and `BEDROCK_AGENT_API_KEY` in
`.env.local` are used by the **site (Next.js)** for the public chatbot, not by start-admin.
start-admin uses CloudWatch and Cost Explorer directly for FinOps dashboards.

The `finops.ts` operations (CloudWatch `GetMetricData`, Cost Explorer `GetCostAndUsage`)
are **admin-internal observability** — they read Bedrock custom metrics and billing data.

### What to do with finops.ts

These CloudWatch + Cost Explorer calls **are not in admin-api** and are a clear gap.

**Options**:
1. Add `GET /api/admin/finops/realtime-usage`, `GET /api/admin/finops/billed-costs`,
   `GET /api/admin/finops/chatbot-usage`, `GET /api/admin/finops/self-healing-usage`
   routes to admin-api — full migration.
2. Keep `finops.ts` server functions as-is in start-admin (they use IMDS credentials,
   no secrets needed) — hybrid approach, defer FinOps migration.

> [!TIP]
> **Recommendation: Defer FinOps**. CloudWatch and Cost Explorer calls are read-only,
> low-frequency, and use IMDS credentials already available to the start-admin pod.
> This does NOT block the article/asset migration. Address in a follow-up.

---

## Complete Gap Analysis — 11 Server Files

| File | Operations | admin-api has it? | Action |
|---|---|---|---|
| `articles.ts` | `QueryCommand` (list), `GetCommand` (get+content), `UpdateCommand` (publish/unpublish/metadata), `DeleteCommand` | ⚠️ Partial | admin-api is missing: **status='review'** querying, `CONTENT#slug` sk delete, and the `contentRef → S3 fetch/write` operations |
| `upload.ts` | `PutObjectCommand` (raw binary) | ❌ Missing | Migrate to presign pattern (Option A above) |
| `auth.ts` | Cognito PKCE, JWT verification, session cookie | ✅ Not needed | `auth.ts` stays local — it manages the session, not AWS data |
| `auth-guard.ts` | JWT cookie read + JWKS verify | ✅ Not needed | Stays local as pre-flight guard; BFF enforces auth independently |
| `finops.ts` | CloudWatch `GetMetricData` (4 different namespaces), Cost Explorer `GetCostAndUsage` | ❌ Missing | **Defer** — keep in start-admin for now |
| `pipelines.ts` | `GetItemCommand` (DynamoDB status), `HeadObjectCommand` (S3 review check), `InvokeCommand` (publish pipeline), `InvokeCommand` (strategist trigger), `InvokeCommand` (applications analysis) | ❌ Missing | Add to admin-api or defer |
| `draft-publish.ts` | S3 draft upload + Lambda trigger | ❌ Missing | Add to admin-api or defer |
| `applications.ts` | DynamoDB CRUD for job applications, `InvokeCommand` (strategist) | ❌ Missing | Defer |
| `resumes.ts` | DynamoDB CRUD + S3 for resumes | ❌ Missing | Defer |
| `comments.ts` | DynamoDB CRUD for comments | ❌ Missing | Defer |
| `security-headers.ts` | Middleware only — no AWS | ✅ N/A | Stays local |

---

## Gaps That Block Phase 1 (Article + Asset Migration)

The current admin-api is missing these operations needed to replace `articles.ts` fully:

### Missing 1: `STATUS#review` article queries

`articles.ts` `getArticlesFn` queries three GSI1 partitions:
- `STATUS#draft`
- `STATUS#review`  ← **not in admin-api**
- `STATUS#published`

The admin-api `GET /api/admin/articles?status=PUBLISHED` only supports the status
forwarded as a query param. The frontend queries all three and merges them.

**Fix**: Admin-api route needs to accept `?status=draft|review|published|all` and
handle the multi-query merge. Or expose a single `?status=all` that returns all statuses.

### Missing 2: S3 content fetch/write for article body

`getArticleContentFn` reads `contentRef` from DynamoDB, then calls `fetchArticleContent(contentRef)`
which GET the MDX from S3. `saveArticleContentFn` writes back via `putArticleContent`.

These are not in admin-api at all. Must add:
- `GET /api/admin/articles/:slug/content` — reads contentRef + fetches MDX from S3
- `PUT /api/admin/articles/:slug/content` — writes MDX body to S3

### Missing 3: `CONTENT#slug` sk deletion

`deleteArticleFn` deletes both `pk=ARTICLE#slug, sk=METADATA` AND `pk=ARTICLE#slug, sk=CONTENT#slug`.
admin-api only deletes the METADATA record.

### Missing 4: `publish/unpublish` via status toggle

`publishArticleFn` / `unpublishArticleFn` update `status`, `gsi1pk`, and `publishedAt`.
admin-api `PUT /:slug` accepts a body with status — this pattern can work, but the frontend
must send the correct `gsi1pk` value or admin-api must derive it from status internally.

---

## Recommended Phase Order (Revised)

```
Phase 0: admin-api gap fill (BLOCKER — before any frontend changes)
  ├── Add GET /api/admin/articles/:slug/content  (S3 MDX read)
  ├── Add PUT /api/admin/articles/:slug/content  (S3 MDX write)
  ├── Fix status query: support all|draft|review|published
  ├── Fix DELETE: remove METADATA + CONTENT#slug sk records
  └── Confirm gsi1pk derivation on status updates

Phase 1: Article + upload migration (core CRUD)
  ├── Replace articles.ts SDK calls → fetch to admin-api
  ├── Forward __session cookie as Bearer token
  ├── Replace uploadMediaFn → presign → browser PUT pattern
  ├── Configure S3 CORS for PUT from admin.nelsonlamounier.com
  └── Smoke test full article CRUD + image upload cycle

Phase 2: Draft publish + pipelines
  ├── Add POST /api/admin/drafts/publish to admin-api
  │     (S3 draft upload + Lambda article trigger)
  ├── Add POST /api/admin/pipelines/publish to admin-api
  ├── Add POST /api/admin/pipelines/strategist to admin-api
  └── Smoke test draft → pipeline → published flow

Phase 3: Resumes (7 endpoints)
  ├── Port dynamodb-resumes logic into admin-api service layer
  ├── Add 7 resume endpoints (list/get/create/update/delete/activate/active)
  ├── Migrate server/resumes.ts → fetch to admin-api
  └── Smoke test resume CRUD + active resume selection
  NOTE: DashboardOverview resumes stat card becomes live here

Phase 4: Deferred (address when admin-api capacity allows)
  ├── finops.ts — keep in start-admin (IMDS, read-only, no blocker)
  ├── applications.ts — STRATEGIST_TABLE_NAME (separate table)
  └── comments.ts — engagement DynamoDB table

  NOTE: ReportContainer is 80% finops → stays working throughout
  NOTE: DashboardOverview will be partial after Phase 1 until Phase 3+4
```
