---
title: "Frontend & RUM" Grafana dashboard — panel review & gaps
type: report
tags: [observability, grafana, rum, grafana-faro, loki, web-vitals, review]
sources:
  - kubernetes-bootstrap/charts/monitoring/chart/dashboards/frontend-rum.json
created: 2026-07-04
updated: 2026-07-04
---

## Scope

Live review of the Grafana dashboard **"Frontend & RUM — portfolio + tucaken"**
(uid `frontend-rum`), verified against the running Grafana on 2026-07-04. The
dashboard is the browser-side (Real User Monitoring) view for **both** the
portfolio site and tucaken; it is selected by two template variables:

- `$app` — `portfolio-frontend` / `portfolio-admin` (multi-value).
- `$env` — `production` / `test`.

**Data sources.** Two, and the split matters:

- **Loki** (`{job="faro"}`) — the raw Faro browser telemetry (events, web-vitals,
  exceptions, navigation) shipped by the browser SDK to the Alloy Faro receiver
  and stored as **logs**. Every per-user, per-page number comes from here via
  LogQL `count_over_time` / `quantile_over_time … | unwrap`.
- **Prometheus** — the **Alloy Faro receiver's own** metrics (`faro_receiver_*`),
  i.e. pipeline health, not user experience.

26 panels across 8 rows. Verified live: `faro_*` = 15 Prometheus series and the
Loki `{job="faro"}` stream are both flowing, so this dashboard **has data**
(unlike the server-side `nextjs-app` dashboard — see [Cross-cutting gap](#cross-cutting-gap-server-side-metrics-were-dark)).

## Row 1 — RUM health (`app=$app env=$env`)

The at-a-glance "is RUM working and what's the volume" strip.

| Panel | Query source | What it shows | Why it's needed |
|:------|:-------------|:--------------|:----------------|
| RUM events (range) | Loki `count_over_time({job="faro"} … [$__range])` | Total telemetry events in range | Sanity: is the browser SDK reporting at all |
| Sessions (range) | Loki `count(sum by (session_id) …)` | Distinct browser sessions | Unique-visitor proxy; denominator for per-session rates |
| Page loads (range) | Loki `… event_name="faro.performance.navigation"` | Navigation events (page views) | Traffic volume; the real load count |
| JS errors (range) | Loki `… kind="exception"` | Uncaught JS exception count | Error volume headline |
| Receiver ingest rate | Prom `rate(faro_receiver_{logs,measurements,exceptions,…}_total[5m])` | Pipeline throughput (req/s) | Is telemetry actually arriving at Alloy |
| Receiver p95 latency | Prom `histogram_quantile(0.95, faro_receiver_request_duration_seconds_bucket)` | Ingest p95 | Alloy receiver health |

Good design: the first four are *experience* (Loki), the last two are *pipeline*
(Prometheus) — so an empty session count with a healthy receiver rate immediately
tells you "SDK not reporting" vs "pipeline down".

## Row 2 — Core Web Vitals p75 (Google thresholds)

Five stat panels (LCP, INP, CLS, TTFB, FCP) plus two trend timeseries, all Loki
`quantile_over_time(0.75, … | type="web-vitals" | <vital>!="" | unwrap <vital>)`.

- **Why p75:** Google evaluates Core Web Vitals at the **75th percentile** — this
  is the exact percentile that affects Search ranking and the "good/poor" verdict,
  so measuring p75 (not average) is correct.
- **Why LCP/INP/CLS separately from TTFB/FCP:** LCP/INP/CLS are the three Core
  Web Vitals (ranking signals); TTFB/FCP are diagnostic loading milestones. The
  "Loading vitals p75 trend" groups the millisecond ones; **CLS has its own trend**
  because it's a unitless score (~0–1), not milliseconds — mixing axes would make
  it unreadable. Correct call.

## Row 3 — Web Vitals rating distribution (good / needs-improvement / poor)

Three pie charts (LCP, INP, CLS) `sum by (context_rating)`. Faro tags each vital
sample with Google's rating band.

**Why it complements Row 2:** a p75 number hides the shape — a p75 of "good" can
still have a long poor tail. The rating split answers *"what fraction of real
users get a poor experience"*, which is the number you actually optimise against.

## Row 4 — Slowest pages

Two tables keyed by `page_url`: **LCP p75 by page** and **Page loads by page**.

**Why both, side by side:** slowness only matters weighted by traffic. A slow
page with 3 loads is noise; a slow page with 40% of traffic is the work item.
Reading the two tables together prioritises optimisation correctly.

## Row 5 — Errors

- **JS errors over time** — Loki `sum by (type) (count_over_time(… kind="exception"))`.
  Trend + breakdown by exception type.
- **Recent exceptions** — a Loki **logs** panel streaming the raw exception lines.

**Why:** the timeseries is for *detection* (spike after a deploy); the logs panel
is for *triage* (the actual message/stack to act on). Both are needed.

## Row 6 — Audience (browser / OS / device)

Three pies: `browser_name`, `browser_os`, `browser_mobile`.

**Why:** tells you which browsers/OSes/devices real visitors use, so testing and
"poor CWV" investigation can be weighted to the actual audience (e.g. if "poor
INP" correlates with mobile, that's where the fix goes).

## Row 7 — Faro ingestion / pipeline health (Alloy receiver)

Prometheus-only, `faro_receiver_*`:

- **Receiver throughput by signal** — logs/measurements/exceptions/events rate,
  split by signal type. Shows *which* telemetry class is flowing (or stopped).
- **Receiver latency + payload size (p50/p95)** — request duration p50/p95 and
  p95 message bytes.

**Why (meta-monitoring):** every experience panel above is only trustworthy if
this row is healthy. If the receiver is dropping data or its latency is climbing,
the CWV numbers are silently wrong. This row is the "can I believe the rest of
this dashboard" guard.

## Row 8 — Browser → SSR → admin-api trace correlation

A single **text** panel ("How to follow a slow page load") — guidance, not a
live panel. It documents the intended RUM → trace workflow. See the gaps below.

## Gaps identified

Ranked by value. **Gaps 1–5 are now applied** in kubernetes-bootstrap
[PR #184](https://github.com/Nelson-Lamounier/kubernetes-bootstrap/pull/184)
(dashboard v2 + `observability:rum` alert group) — each is marked ✅ below with
what shipped. Gaps 6–7 are Faro SDK capture-config changes, left as follow-up.

1. ✅ **Row 8 is only text — no actual RUM→trace correlation.** The row promises
   "Browser → SSR → admin-api trace correlation" but ships no Tempo panel or
   exemplar link. Faro's `TracingInstrumentation` already emits browser spans to
   Tempo, and Prometheus has `native-histograms`/`exemplar-storage` enabled — so a
   real "click a slow LCP → jump to the trace" flow is achievable. **Highest-value
   gap:** add a Tempo trace-list panel filtered by session/page, or exemplars on
   the vitals trend.
   *Shipped:* a live Tempo TraceQL table (slow frontend/SSR traces >300ms,
   click-through to the waterfall) under the retained guidance text.
2. ✅ **No client-perceived API latency.** Faro captures `fetch`/XHR timing, but no
   panel shows how the browser experiences `/api/chat`, `/api/articles`, etc.
   (duration, error rate). This is the client half of the BFF story and is
   currently invisible. Add a "Client API calls — p95 / error rate by endpoint".
   *Shipped:* "Client API p95 by endpoint" (from `faro.tracing.fetch`,
   `event_data_duration_ns`, filtered to `/api/`) + "Client API calls by HTTP
   status" (surfaces `status=0` aborts and 5xx the server can't see). Live proof
   it was worth it: `/api/chat` p95 ≈ **5.7s** vs `/api/resume/active` ≈ 38ms.
3. ✅ **Errors are counts, not rates.** Rows 1/5 show error *volume*. Without a
   denominator (errors ÷ sessions or ÷ page-loads) you can't tell "10 errors" =
   catastrophe or noise. *Shipped:* a **JS errors per session** stat
   (`sum(exceptions) / count(sessions)`).
4. ✅ **No RUM ↔ server (`nextjs_*`) correlation.** Now that server metrics will flow
   (see below), nothing ties client `TTFB` (from RUM) to server
   `nextjs_http_request_duration_seconds` (from the pod). *Shipped (partial):*
   dashboard **links** row to `nextjs-app` and `networking` for one-click pivot;
   a single combined client-vs-server panel remains a nice-to-have.
5. ✅ **No alerts / annotations wired.** There are no alert rules referenced for the
   things that matter here: a CWV regression, an error spike, or — most important —
   the **Faro receiver going down** (which silently blinds all of RUM).
   *Shipped:* `observability:rum` rule group — **FaroReceiverAbsent** and
   **FaroReceiverIngestLatencyHigh**. (A CWV-regression alert is still open.)
6. **INP/CLS lack attribution.** INP is a single p75 with no breakdown by
   interaction target; CLS has no "which elements shifted". This is a Faro
   capture-config question, but worth noting — the current panels tell you *that*
   INP/CLS are poor, not *what* to fix.
7. **No connection/geo dimension.** Faro can capture connection `effectiveType`
   (2G/3G/4G) and coarse geo; neither is shown. Low priority for a portfolio, but
   it's often the explanation for a "poor LCP on mobile" tail.

## Cross-cutting gap: server-side metrics were dark

While reviewing this (RUM) dashboard live, the **server-side** companion
`nextjs-app` ("Next.js App — Portfolio Application Metrics") was found **empty**:
Prometheus `up{job="nextjs-app"}=0`, scrape error `HTTP 503`, because
`/api/metrics` fails closed in production and no bearer token was wired on EKS.
So **RUM was healthy but every `nextjs_*` application metric was uncollected** —
the single biggest observability gap. This is fixed in
`kubernetes-bootstrap` PR #183 (shared bearer token via ESO on both the pod and
Prometheus). Once deployed, gap #4 above (RUM↔server correlation) becomes
possible.

## Related

- [Observability architecture](../concepts/observability-architecture.md) — the
  OTel + Prometheus + Faro stack this dashboard sits on top of.

<!--
Evidence trail:
- Live: Grafana API /api/dashboards/uid/frontend-rum (2026-07-04) — 26 panels, 8 rows, vars app/env
- Live: Grafana Prometheus proxy — faro_* = 15 series; up{job="nextjs-app"}=0 (503)
- Live: kubectl exec nextjs pod — /api/metrics = {"error":"Metrics authentication is not configured"}, METRICS_* unset
- Source: kubernetes-bootstrap/charts/monitoring/chart/dashboards/frontend-rum.json
- Live: Loki faro.tracing.fetch — /api/chat p95 ≈5.7s, /api/resume/active ≈38ms; statuses 200/500/503/0 present (grounds the client-API panels)
- Live: Tempo /api/search resource.service.name=portfolio-frontend|nextjs-frontend returns traces (grounds the live trace panel)
- Applied: kubernetes-bootstrap PR #184 — frontend-rum.json v2 + observability:rum alert group (gaps 1–5)
-->
