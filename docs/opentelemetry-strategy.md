# OpenTelemetry Observability Strategy

## Why OpenTelemetry Was Added

The Next.js application transitioned from fetching articles via API Gateway to direct DynamoDB SDK calls through a VPC Gateway Endpoint. This eliminated a 5-hop network path but created a **visibility gap**: DynamoDB calls inside the VPC are invisible to external monitoring tools without explicit instrumentation.

**The problem OpenTelemetry solves:**

| Before OTel                                        | After OTel                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| DynamoDB calls invisible in any dashboard          | Every SDK call traced with duration, table, operation                           |
| No way to know if app fell back to file-based data | Span attribute `article.source` and structured log field show exact data source |
| Errors only visible in container stdout            | Errors surfaced in X-Ray traces, Prometheus counters, and structured JSON logs  |
| No cache performance visibility                    | Hit/miss counters exposed at `/api/metrics`                                     |

### Why OpenTelemetry over aws-xray-sdk-node?

`aws-xray-sdk-node` entered maintenance mode in February 2026 and has critical gaps with AWS SDK v3:

- Missing table names in DynamoDB subsegments
- No metrics support (traces only)
- No vendor-neutral export (X-Ray only)

OpenTelemetry is the CNCF standard that AWS officially recommends going forward. It supports traces, metrics, and logs — all from a single SDK.

---

## Three Pillars of Observability

The implementation covers all three observability pillars, each routed to the appropriate backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js ECS Container                        │
│                                                                 │
│  ┌─────────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   OTel Traces    │    │  Prometheus   │    │ Structured    │  │
│  │   (custom spans  │    │  Metrics      │    │ JSON Logs     │  │
│  │   + auto SDK)    │    │  (/api/metrics│    │ (slog)        │  │
│  └────────┬─────────┘    └──────┬───────┘    └──────┬────────┘  │
│           │                     │                    │           │
└───────────┼─────────────────────┼────────────────────┼───────────┘
            │                     │                    │
            ▼                     ▼                    ▼
    ┌───────────────┐    ┌────────────────┐    ┌──────────────┐
    │ ADOT Sidecar  │    │  Prometheus    │    │  Promtail    │
    │ (OTLP/gRPC)   │    │  (EC2 scrape)  │    │  (sidecar)   │
    └───────┬───────┘    └────────┬───────┘    └──────┬───────┘
            │                     │                    │
            ▼                     ▼                    ▼
    ┌───────────────┐    ┌────────────────┐    ┌──────────────┐
    │  AWS X-Ray    │    │   Grafana      │    │  Grafana     │
    │  (or Tempo)   │    │  (dashboards)  │    │  Loki        │
    └───────────────┘    └────────────────┘    └──────────────┘
```

### Pillar 1: Traces (OpenTelemetry → X-Ray or Tempo)

**What's instrumented:**

- Auto-instrumentation patches `@aws-sdk/*` calls → DynamoDB Query/GetItem appear as spans
- Custom business spans wrap service operations: `ArticleService.getAllArticles`, `getArticleBySlug`, `getArticlesByTag`, `getArticleMetadata`
- Span attributes include: `article.source`, `article.count`, `article.slug`, `article.tag`
- HTTP instrumentation captures Next.js request spans

**Current backend:** AWS X-Ray (via ADOT Collector sidecar)
**Alternative backend:** Grafana Tempo (change `OTEL_EXPORTER_OTLP_ENDPOINT` to Tempo's OTLP receiver)

**File:** `src/instrumentation.ts`

### Pillar 2: Metrics (prom-client → Prometheus → Grafana)

**What's instrumented:**

| Metric                                    | Type      | Labels                          | Description                             |
| ----------------------------------------- | --------- | ------------------------------- | --------------------------------------- |
| `nextjs_dynamodb_query_duration_seconds`  | Histogram | `operation`, `index`            | DynamoDB SDK call latency               |
| `nextjs_dynamodb_errors_total`            | Counter   | `operation`, `error_type`       | DynamoDB SDK errors                     |
| `nextjs_article_service_requests_total`   | Counter   | `operation`, `source`, `status` | Article service requests by data source |
| `nextjs_article_service_duration_seconds` | Histogram | `operation`, `source`           | Article service latency                 |
| `nextjs_article_data_source`              | Gauge     | `source`                        | Currently active data source            |
| `nextjs_dynamodb_cache_hits_total`        | Counter   | `cache_key_prefix`              | TTL cache hits                          |
| `nextjs_dynamodb_cache_misses_total`      | Counter   | `cache_key_prefix`              | TTL cache misses                        |

**Endpoint:** `GET /api/metrics` (existing prom-client route)
**Backend:** Prometheus (existing EC2 instance, needs scrape config update)

**Files:** `src/lib/metrics.ts`, `src/lib/dynamodb-articles.ts`, `src/lib/article-service.ts`

### Pillar 3: Logs (structured JSON → Promtail → Loki → Grafana)

**What's instrumented:**

- `slog()` function outputs JSON to stdout:
  ```json
  {
    "timestamp": "2026-02-11T05:00:00.000Z",
    "service": "article-service",
    "operation": "getAllArticles",
    "source": "dynamodb-sdk",
    "count": 4,
    "latencyMs": 3,
    "level": "info"
  }
  ```
- All article service operations emit structured logs with: `service`, `operation`, `source`, `count`, `latencyMs`, `error`, `level`
- Error logs include error messages and fallback indicators

**Backend:** Loki (via existing Promtail sidecar)
**Query example:** `{service="article-service"} | json | source = "file-based"`

**File:** `src/lib/article-service.ts`

---

## Benefits

### For Debugging

- **End-to-end trace visibility**: See the full request path from HTTP → ArticleService → DynamoDB in X-Ray
- **Fallback detection**: Immediately know when DynamoDB is unreachable and the app fell back to file-based articles
- **Latency investigation**: Histogram metrics show p50/p95/p99 latencies for DynamoDB queries

### For Operations

- **Proactive alerting**: Prometheus can alert on `nextjs_dynamodb_errors_total` increasing or cache hit rate dropping
- **Data source monitoring**: The `nextjs_article_data_source` gauge shows which data source is currently active
- **AIOps readiness**: Structured JSON logs can be consumed by CloudWatch Anomaly Detection or LLM agents for auto-diagnosis

### For FinOps

- **Cache effectiveness**: `nextjs_dynamodb_cache_hits_total` vs `misses_total` proves the TTL cache is working
- **Zero incremental cost**: Prometheus metrics and structured logs add no AWS service charges
- **X-Ray cost control**: Traces can be sampled (1%, 10%, 100%) via ADOT Collector config

---

## Environment Variables

### Frontend App (ECS Task Definition)

| Variable                      | Default                 | Description                       |
| ----------------------------- | ----------------------- | --------------------------------- |
| `OTEL_SDK_DISABLED`           | `true`                  | Set to `false` to enable tracing  |
| `OTEL_SERVICE_NAME`           | `nextjs-portfolio`      | Service name in X-Ray traces      |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | ADOT Collector or Tempo endpoint  |
| `DYNAMODB_TABLE_NAME`         | (none)                  | Enables DynamoDB SDK data layer   |
| `DYNAMODB_CACHE_TTL_MS`       | `300000`                | TTL cache duration (5 min)        |
| `METRICS_ENABLED`             | `true`                  | Enable/disable Prometheus metrics |

### ADOT Collector Sidecar

The ADOT Collector needs no custom config for basic X-Ray forwarding. The default ECS configuration exports traces to X-Ray.

---

## What Needs to Be Implemented in the CDK Monitoring Repo

### 1. Prometheus Scrape Config: Add Next.js Application Metrics Job

The existing Prometheus scrapes node-exporter on port `9100` via EC2 service discovery (`job: ecs-nextjs-node-exporter`). A new job is needed to scrape the application metrics endpoint on the **container port** exposed by the Next.js ECS task.

**In `UserDataBuilder.setupEcsScrapeConfig()`**, add:

```yaml
- job_name: 'nextjs-application-metrics'
  metrics_path: '/api/metrics'
  scrape_interval: 30s
  ec2_sd_configs:
    - region: ${REGION}
      port: 3000
      filters:
        - name: 'tag:Purpose'
          values: ['NextJS']
  relabel_configs:
    - source_labels: [__meta_ec2_tag_Name]
      target_label: instance_name
    - source_labels: [__meta_ec2_tag_Environment]
      target_label: environment
    - source_labels: [__meta_ec2_private_ip]
      replacement: '${1}:3000'
      target_label: __address__
```

> [!IMPORTANT]
> The existing `ecs-nextjs-node-exporter` job scrapes port `9100` for host metrics. This new job scrapes port `3000` on the same instances for application metrics from the Next.js container's `/api/metrics` endpoint.

### 2. Security Group: Allow Prometheus → Next.js Port 3000

The monitoring EC2 instance must be allowed to reach port `3000` on the ECS instances:

```typescript
// In NextJsApplicationStack (nextjs repo) or NextJsNetworkingStack
nextjsSecurityGroup.addIngressRule(
  ec2.Peer.securityGroupId(monitoringSecurityGroupId),
  ec2.Port.tcp(3000),
  'Allow Prometheus to scrape application metrics'
);
```

> [!NOTE]
> Port `9100` (node-exporter) is already allowed. This adds port `3000` for the Next.js app metrics endpoint.

### 3. Grafana Dashboard: New `nextjs-otel.json`

Add a new dashboard to `scripts/monitoring/dashboards/nextjs-otel.json` with the following panels:

**Row 1: Data Source Overview**

- Gauge: `nextjs_article_data_source` (which source is active)
- Stat: `rate(nextjs_article_service_requests_total[5m])` (requests/sec by source)

**Row 2: DynamoDB Performance**

- Histogram: `nextjs_dynamodb_query_duration_seconds` (p50, p95, p99 by operation)
- Counter rate: `rate(nextjs_dynamodb_errors_total[5m])` (errors/sec)

**Row 3: Cache Effectiveness**

- Pie chart: `nextjs_dynamodb_cache_hits_total` vs `nextjs_dynamodb_cache_misses_total`
- Time series: `rate(nextjs_dynamodb_cache_hits_total[5m])` (hit rate over time)

**Row 4: Article Service Latency**

- Heatmap: `nextjs_article_service_duration_seconds` (latency distribution)
- Counter rate: `rate(nextjs_article_service_requests_total{status="error"}[5m])` (error rate)

### 4. (Optional) ADOT Collector Sidecar for X-Ray Traces

If you want traces in X-Ray, add an ADOT Collector sidecar to the ECS task definition:

```typescript
// In NextJsApplicationStack
const adotContainer = taskDefinition.addContainer('adot-collector', {
  image: ecs.ContainerImage.fromRegistry(
    'public.ecr.aws/aws-observability/aws-otel-collector:latest'
  ),
  essential: false,
  memoryLimitMiB: 256,
  logging: new ecs.AwsLogDriver({
    streamPrefix: 'adot',
    logGroup: new logs.LogGroup(this, 'AdotLogGroup', {
      logGroupName: `/ecs/nextjs/adot-collector-${props.environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
    }),
  }),
  environment: {
    AOT_CONFIG_CONTENT: JSON.stringify({
      extensions: { health_check: {} },
      receivers: {
        otlp: {
          protocols: { grpc: { endpoint: '0.0.0.0:4317' } },
        },
      },
      exporters: { awsxray: { region: props.region } },
      service: {
        extensions: ['health_check'],
        pipelines: {
          traces: {
            receivers: ['otlp'],
            exporters: ['awsxray'],
          },
        },
      },
    }),
  },
});
```

> [!WARNING]
> The ADOT Collector sidecar requires the ECS task role to have `xray:PutTraceSegments` and `xray:PutTelemetryRecords` permissions.

### 5. (Optional) Grafana Tempo for Traces (Alternative to X-Ray)

If you prefer all observability in Grafana instead of X-Ray:

1. Add Tempo container to the monitoring EC2 docker-compose alongside Prometheus, Grafana, Loki
2. Configure Tempo with OTLP gRPC receiver on port `4317`
3. Point `OTEL_EXPORTER_OTLP_ENDPOINT` in the ECS task to the monitoring EC2's private IP
4. Add Tempo as a Grafana datasource
5. The traces will appear in Grafana's Explore → Tempo view

**Zero code changes in the Next.js app** — only the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable changes.

---

## Implementation Checklist (CDK Monitoring Repo)

| #   | Task                                                      | Priority   | Effort |
| --- | --------------------------------------------------------- | ---------- | ------ |
| 1   | Add `nextjs-application-metrics` scrape job to Prometheus | **High**   | 15 min |
| 2   | Add port 3000 security group ingress rule                 | **High**   | 5 min  |
| 3   | Create `nextjs-otel.json` Grafana dashboard               | **Medium** | 30 min |
| 4   | Add ADOT Collector sidecar to ECS task definition         | **Medium** | 20 min |
| 5   | Set `OTEL_SDK_DISABLED=false` in ECS task env vars        | **Medium** | 5 min  |
| 6   | Add `xray:Put*` to ECS task role policy                   | **Medium** | 5 min  |
| 7   | (Optional) Add Tempo to monitoring docker-compose         | **Low**    | 45 min |

> [!TIP]
> Start with items 1-3. These enable Prometheus metrics scraping and Grafana dashboards with zero changes to the running Next.js app (the `/api/metrics` endpoint is already active). Items 4-6 enable X-Ray tracing and can be done as a follow-up.

---

## File Reference

| File                           | Role                                                               |
| ------------------------------ | ------------------------------------------------------------------ |
| `src/instrumentation.ts`       | OTel SDK initialization (traces)                                   |
| `src/lib/metrics.ts`           | Prometheus metric definitions (prom-client)                        |
| `src/lib/metrics-config.ts`    | Histogram buckets, feature flags, sampling                         |
| `src/app/api/metrics/route.ts` | `/api/metrics` endpoint serving Prometheus format                  |
| `src/lib/dynamodb-articles.ts` | DynamoDB SDK data layer + cache metrics                            |
| `src/lib/article-service.ts`   | Hybrid service with OTel spans + structured logs + request metrics |
| `Dockerfile`                   | OTel environment variable defaults                                 |
| `next.config.mjs`              | Instrumentation hook + gRPC external packages                      |
