# Article Generation Trigger — Architecture Review

> **Last updated:** 2026-04-15 — reflects production-hardening session.
> All bugs identified in the original review have been resolved and verified with 25 passing tests.

## Overview

The article generation pipeline has **two distinct trigger paths** depending on context, and a **separate publish path** for admin approval. All generation paths converge on the same Step Functions state machine.

---

## Trigger Architecture

```mermaid
flowchart TD
    A["Admin Dashboard\n(start-admin)"] -->|POST /api/admin/drafts/:slug| B["admin-api BFF\n(drafts.ts)"]
    B -->|1. PutObject drafts/slug.md| C["S3 Assets Bucket"]
    B -->|2. Lambda.invoke — RequestResponse\nSynthetic S3 event| D["Trigger Lambda\nbedrock-development-pipeline-trigger"]

    C -->|S3 Event Notification\nprefix=drafts/ suffix=.md| D

    A2["Admin Dashboard"] -->|POST /api/admin/pipelines/article\n{ slug }| P["admin-api BFF\n(pipelines.ts)"]
    P -->|Lambda.invoke — Event async\nSynthetic S3 event| D

    D -->|1. QueryCommand — resolve version| E["DynamoDB\nPipeline Table"]
    D -->|2. PutCommand — status=processing| E
    D -->|3. StartExecution| F["Step Functions\nbedrock-development-article-pipeline"]

    F --> G["Research Lambda\nHaiku 4.5"]
    G --> H["Writer Lambda\nSonnet 4.6"]
    H --> I["QA Lambda\nSonnet 4.6"]
    I -->|S3 write review/*.mdx\nDynamoDB write status=review| J["Article ready for review"]

    A3["Admin Dashboard"] -->|POST /api/admin/articles/:slug/publish\n{ version, action }| L["admin-api BFF\n(articles.ts)"]
    L -->|Lambda.invoke — Event async| M["Publish Lambda\nbedrock-development-pipeline-publish"]
    M -->|S3 copy + DynamoDB METADATA update\n+ ISR revalidation| N["Article published live"]

    A4["Admin Dashboard"] -->|GET /api/admin/articles/:slug/versions| V["admin-api BFF\n(articles.ts)"]
    V -->|Lambda.invoke — RequestResponse| VH["Version History Lambda\nbedrock-development-pipeline-version-history"]
    VH --> VR["VERSION#v<n> records\nfrom DynamoDB"]
```

---

## Layer 1: CDK Infrastructure (`infra/lib/stacks/bedrock/pipeline-stack.ts`)

### Resources Created

| Resource | Name Pattern | Purpose |
|---|---|---|
| Lambda | `{prefix}-pipeline-trigger` | S3 event → SFN start |
| Lambda | `{prefix}-pipeline-research` | Bedrock Research Agent (Haiku 4.5) |
| Lambda | `{prefix}-pipeline-writer` | Bedrock Writer Agent (Sonnet 4.6) |
| Lambda | `{prefix}-pipeline-qa` | Bedrock QA Agent (Sonnet 4.6) |
| Lambda | `{prefix}-pipeline-publish` | Admin-invoked publish handler |
| Lambda | `{prefix}-pipeline-version-history` | Admin dashboard query |
| SFN | `{prefix}-article-pipeline` | Orchestrator (Research→Writer→QA) |
| SQS | `{prefix}-pipeline-dlq` | Dead-letter queue (14 day retention) |

### S3 Event Notification (the native trigger)

```typescript
// pipeline-stack.ts
assetsBucket.addEventNotification(
    s3.EventType.OBJECT_CREATED,
    new s3n.LambdaDestination(this.triggerFunction),
    { prefix: 'drafts/', suffix: '.md' },
);
```

Any `*.md` file created under `drafts/` on the assets bucket fires the trigger Lambda automatically. This is the **production trigger path**.

### SSM Exports

All four ARNs the admin-api requires are published to SSM:

| SSM Path | Env Var | Purpose |
|---|---|---|
| `/{prefix}/pipeline-trigger-function-arn` | `ARTICLE_TRIGGER_ARN` | Trigger Lambda |
| `/{prefix}/pipeline-publish-function-arn` | `PUBLISH_LAMBDA_ARN` | Publish Lambda |
| `/{prefix}/pipeline-version-history-function-arn` | `VERSION_HISTORY_LAMBDA_ARN` | Version history |

`deploy.py` reads these from SSM and writes them into the `admin-api-config` Kubernetes ConfigMap on each deployment.

---

## Layer 2: Trigger Lambda (`bedrock-applications/article-pipeline/src/handlers/trigger-handler.ts`)

### Handler Signature

```typescript
export const handler: S3Handler = async (event: S3Event): Promise<void>
```

The handler is typed as an `S3Handler`, meaning it **must** receive `event.Records[].s3.bucket.name` + `event.Records[].s3.object.key`. Any invocation without a `Records` array is silently a no-op.

### Execution Flow

1. **Extract slug** — parses `drafts/<slug>.md` from the S3 key via regex `/^drafts\/(.+)\.md$/`
2. **Resolve version** — `resolveNextVersion(slug)` queries DynamoDB for the highest existing `VERSION#v<n>` sort key and increments by 1 (returns 1 for new articles)
3. **Build `PipelineContext`** — sets `pipelineId`, `slug`, `sourceKey`, `bucket`, `version`, timestamps, and zeroed token/cost counters
4. **Write `VERSION#v<n>` to DynamoDB** — status `processing`, GSI1 keyed as `STATUS#processing / {date}#{slug}#v{version}` for dashboard polling
5. **Start Step Functions execution** — `StartExecutionCommand` with execution name `{slug}-{timestamp}` and serialised `ResearchHandlerInput`

> [!IMPORTANT]
> The `METADATA` record is **not touched** by the trigger. It is only updated by `publish-handler.ts` on admin approval, ensuring the currently-published live state is preserved during regeneration.

---

## Layer 3: Admin API BFF (`api/admin-api/src/`)

### Route Registration (`src/index.ts`)

```typescript
app.route('/api/admin/drafts',    createDraftsRouter(config));    // New draft upload
app.route('/api/admin/articles',  createArticlesRouter(config));  // Article lifecycle + versions
app.route('/api/admin/pipelines', createPipelinesRouter(config)); // Pipeline re-triggers
```

All routes are protected by `cognitoJwtAuth` middleware.

---

### Path A: Draft Upload (`routes/drafts.ts`)

**Route:** `POST /api/admin/drafts/:slug`

The **primary creation trigger** — used when an admin submits a new draft from the editor.

**Two-step flow:**

1. `PutObjectCommand` → `s3://assets-bucket/drafts/{slug}.md`
2. Direct Lambda invocation (`InvocationType: 'RequestResponse'`) with a **synthetic S3 event**

```typescript
const syntheticS3Event = {
    Records: [{ s3: { bucket: { name: config.assetsBucketName }, object: { key } } }],
};
const invokeResult = await lambda.send(new InvokeCommand({
    FunctionName: config.articleTriggerArn,
    InvocationType: 'RequestResponse', // sync — captures Lambda errors for diagnosis
    Payload: Buffer.from(JSON.stringify(syntheticS3Event)),
}));
```

**Error surfacing:** The response reflects the Lambda outcome:

| Scenario | HTTP | Response body |
|---|---|---|
| S3 upload fails | `500` | `{ error: "S3 upload failed: …" }` |
| Lambda `FunctionError` | `201` | `{ uploaded: true, triggered: false, triggerError: "Handled" }` |
| Lambda invocation throws | `201` | `{ uploaded: true, triggered: false, triggerError: "Network timeout" }` |
| Full success | `201` | `{ uploaded: true, triggered: true, slug, key }` |

The draft is always safe in S3. If the Lambda invocation fails, the S3 event notification will still fire the trigger automatically in production.

---

### Path B: Pipeline Re-trigger (`routes/pipelines.ts`)

**Route:** `POST /api/admin/pipelines/article`

Used to **re-trigger an existing draft** without re-uploading. Constructs the same synthetic S3 event shape as `drafts.ts`:

```typescript
// Requires: { slug: string } in request body
const syntheticS3Event = {
    Records: [
        {
            s3: {
                bucket: { name: config.assetsBucketName },
                object: { key: `drafts/${slug}.md` },
            },
        },
    ],
};
await invokeAsync(config.articleTriggerArn, syntheticS3Event);
// InvocationType: 'Event' — async fire-and-forget
// Response: 202 { queued: true, pipeline: 'article', slug, key }
```

> [!NOTE]
> `slug` is required in the body. Returns `400` if absent or empty so the error is explicit rather than a silent no-op inside the Lambda.

---

### Path C: Publish (`routes/articles.ts`)

**Route:** `POST /api/admin/articles/:slug/publish`

A **completely separate** human-gated path — invokes the **publish Lambda** (`config.publishLambdaArn`) asynchronously:

```typescript
await getLambdaClient().send(new InvokeCommand({
    FunctionName: config.publishLambdaArn,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify({ slug, version, action, triggeredBy, triggeredAt })),
}));
// Response: 202 { queued: true, slug }
```

**Why separate from generation:**

| Concern | Generation (trigger) | Publication |
|---|---|---|
| Triggered by | S3 write or admin UI | Explicit admin approval |
| Gated by human review | ❌ No | ✅ Yes |
| Mutates public/live state | ❌ No — draft/review only | ✅ Yes — changes live site |
| Fires ISR revalidation | ❌ No | ✅ Yes |
| Creates new version record | ✅ Yes (`VERSION#v<n>`) | ❌ No — promotes existing |
| Part of Step Functions | ✅ Yes | ❌ No — runs independently |

The separation is intentional editorial control: AI generates a candidate, a human approves before it goes live.

---

### Path D: Version History (`routes/articles.ts`)

**Route:** `GET /api/admin/articles/:slug/versions?limit=<n>`

Queries the complete pipeline version history for an article slug:

```typescript
const invokeResult = await getLambdaClient().send(new InvokeCommand({
    FunctionName: config.versionHistoryLambdaArn,
    InvocationType: 'RequestResponse', // sync — we need the result
    Payload: Buffer.from(JSON.stringify({ slug, limit })),
}));
// Response: 200 { success, slug, totalVersions, versions[] }
//         | 502 { error } — Lambda error or invocation failure
```

Default limit: 20, maximum: 50. Errors are surfaced as `502` rather than swallowed.

---

## Configuration Wiring

### `AdminApiConfig` — All Required Fields

| Env Var | Config Field | Consumer | Source in K8s |
|---|---|---|---|
| `ARTICLE_TRIGGER_ARN` | `articleTriggerArn` | `drafts.ts`, `pipelines.ts` | ConfigMap ← SSM |
| `VERSION_HISTORY_LAMBDA_ARN` | `versionHistoryLambdaArn` | `articles.ts` (versions route) | ConfigMap ← SSM |
| `PUBLISH_LAMBDA_ARN` | `publishLambdaArn` | `articles.ts` (publish route) | ConfigMap ← SSM |
| `ASSETS_BUCKET_NAME` | `assetsBucketName` | `drafts.ts`, `pipelines.ts` | ConfigMap ← SSM |
| `DYNAMODB_TABLE_NAME` | `dynamoTableName` | `articles.ts`, `content.ts` | ConfigMap ← SSM |

All fields are **required** — the server refuses to start (`process.exit(1)`) if any are missing.

### deploy.py → K8s ConfigMap (production)

`deploy.py` on the cluster node reads the four ARNs from SSM Parameter Store and writes them into the `admin-api-config` ConfigMap:

```python
_bedrock_params = {
    "pipeline-trigger-function-arn":          "ARTICLE_TRIGGER_ARN",
    "pipeline-version-history-function-arn":  "VERSION_HISTORY_LAMBDA_ARN",
    "pipeline-publish-function-arn":           "PUBLISH_LAMBDA_ARN",
    ...
}
```

### Local Docker testing

For local development, all env vars are sourced directly from `api/admin-api/.env` — no K8s or `deploy.py` required:

```bash
# Start container (stop → build → verify AWS creds → start → health-poll)
just admin-api-up

# Smoke test (requires Cognito JWT from admin UI browser dev tools)
just admin-api-test <cognito-token>
```

The `~/.aws` directory is mounted read-only. Set `AWS_PROFILE=dev-account` to use local credentials.

---

## Test Coverage

| Suite | Tests | What's covered |
|---|---|---|
| `__tests__/lib/config.test.ts` | 5 | Fail-fast validation, all required fields |
| `__tests__/routes/drafts.test.ts` | 8 | S3 upload, synthetic S3 event shape, FunctionError surfacing, invocation throws |
| `__tests__/routes/pipelines.test.ts` | 12 | S3Handler contract regression guard, slug validation, strategist route |

Key regression test that prevents the original bug from recurring:

```typescript
it('sends a synthetic S3 event with a Records[] array (S3Handler contract)', async () => {
    // Any payload without Records[] causes the trigger Lambda to silently no-op
    expect(Array.isArray(payload.Records)).toBe(true);
    expect(payload.Records[0]?.s3.bucket.name).toBe('test-assets-bucket');
    expect(payload.Records[0]?.s3.object.key).toBe('drafts/s3-contract-test.md');
});
```

**All 25 tests pass.**
