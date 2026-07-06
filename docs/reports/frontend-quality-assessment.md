---
title: Frontend application quality assessment — metrics vs industry standard
type: report
tags: [observability, core-web-vitals, quality, rum, benchmark, grafana-faro, performance]
sources:
  - kubernetes-bootstrap/charts/monitoring/chart/dashboards/frontend-rum.json
  - apps/site/src/lib/observability/faro.ts
  - apps/site/src/lib/observability/metrics.ts
created: 2026-07-04
updated: 2026-07-04
---

## Scope & method

This report benchmarks the **live** metrics behind the "Frontend & RUM —
portfolio + tucaken" Grafana dashboard against the accepted industry-standard
quality bars, and quantifies each as a percentage. Every "What is the metric"
figure below was read live from Grafana on **2026-07-04** for
`app_name="portfolio-frontend"`, `env=production`, over a **7-day** window.

The industry bars are **Google's Core Web Vitals thresholds** (the same ones
that drive Search ranking and the Chrome UX Report "passing" verdict) plus
standard SRE norms for error rate, API latency, and runtime health.

> **Statistical caveat.** In the 7-day window the site saw **26 sessions / 38
> page loads**. That is enough to be *directional* but **not** statistically
> robust — a single slow page or one error swings a percentage hard. Treat the
> scores as "is the shape right", not as a high-traffic SLO report. Percentages
> are recomputed automatically as traffic grows.

## Executive summary

| Quality dimension | Score | Verdict |
|:------------------|:-----:|:--------|
| Core Web Vitals (loading/interactivity) | **95%** | Excellent — LCP/INP/TTFB/FCP far inside "good" |
| Visual stability (CLS) | **70%** | ⚠️ The one weak axis — article pages shift |
| Reliability (error-free sessions) | **96%** | Good; the one error is already fixed |
| Client-perceived API latency | **60%** | ⚠️ `/api/chat` p95 ~8s (LLM), resume ~1.3s |
| Server runtime health | **95%** | Excellent — low memory, event-loop lag ~10ms |
| Observability coverage | **80%** | Strong RUM; **no server HTTP RED metrics** |
| **Overall (weighted)** | **≈ 85%** | **Production-grade, with CLS + chat latency the two real work items** |

---

## 1. Core Web Vitals — p75 (the ranking-critical trio + diagnostics)

Google evaluates at the **75th percentile**. "Good / needs-improvement / poor"
bands are Google's.

| Metric | What it should be (p75 "good") | What the metric is (p75) | % of the "good" budget used | Rating |
|:-------|:-------------------------------|:-------------------------|:---------------------------:|:------:|
| **LCP** (Largest Contentful Paint) | ≤ 2500 ms | **132 ms** | 5% | 🟢 Excellent |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | **120 ms** | 60% | 🟢 Good |
| **CLS** (Cumulative Layout Shift) | ≤ 0.10 | **≈ 0.0 aggregate** (but see §2) | — | 🟡 mixed |
| **TTFB** (Time to First Byte) | ≤ 800 ms | **40 ms** | 5% | 🟢 Excellent |
| **FCP** (First Contentful Paint) | ≤ 1800 ms | **132 ms** | 7% | 🟢 Excellent |

**Read:** loading and server responsiveness are outstanding. The **40 ms TTFB**
is a direct payoff of the architecture — the pod serves static assets in-cluster
with no CloudFront hop, and reads go through the in-cluster BFF. **INP at 120 ms**
is comfortably "good" but the only vital using a meaningful slice of its budget
(60%); worth watching as interactive features grow.

---

## 2. Visual stability (CLS) — the one axis below the bar

CLS is where the site does **not** clear the industry bar. The aggregate p75 is
low, but the **distribution and per-page** view (added to the dashboard this
iteration) tell the real story:

| View | What it should be | What the metric is | Rating |
|:-----|:------------------|:-------------------|:------:|
| **% of samples "good"** (CrUX passing bar) | ≥ **75%** good | **69.8%** good · 25.6% needs-improvement · 4.7% poor | 🟡 below bar |
| **Worst page** (CLS p75 by page) | ≤ 0.10 | article pages up to **0.44 / 0.30 / 0.24** | 🔴 poor |

**What it should be:** ≥ 75% of page views in "good" and no page above 0.10.
**What it is:** 69.8% good (5 points short) with **article pages** doing the
shifting — a p75 of **0.44** on the worst is firmly "poor". The cause is the
classic one: late-loading content (cover images, Mermaid diagrams that render
client-side, code blocks, web fonts) with no reserved space, so the layout jumps
after first paint. **This is the single highest-leverage frontend fix.**

**Fix direction:** reserve dimensions for images/embeds (`width`/`height` or
aspect-ratio boxes), give the client-rendered `<Mermaid>` a fixed-height
skeleton until the SVG mounts, and preload the article font. Re-check the "CLS
p75 by page" table after — the target is every article < 0.10.

---

## 3. Reliability — error-free sessions

| Metric | What it should be | What the metric is | Rating |
|:-------|:------------------|:-------------------|:------:|
| **Error-free session rate** | ≥ **99%** (Sentry/industry norm) | ~**96%** (1 JS error across 26 sessions) | 🟡 tiny-sample |
| **JS errors per session** | < 0.01 | **0.038** | 🟡 tiny-sample |

The single error in the window was the **Mermaid parse error** on one article —
already fixed at source (article updated 2026-07-02 14:00; zero recurrences
since). At this traffic level one error is enough to miss the 99% bar, so the
percentage is fragile rather than alarming. The right posture: keep the
`FaroReceiverAbsent` alert (so errors never go unseen) and re-measure at higher
volume.

---

## 4. Client-perceived API latency (Faro `fetch` spans)

How the **browser** experiences the site's own `/api/*` calls — the client half
of the BFF story, invisible to server metrics.

| Endpoint | What it should be (p95) | What the metric is (p95) | Rating |
|:---------|:------------------------|:-------------------------|:------:|
| `/api/chat` (Bedrock RAG) | ≤ 3000 ms *(LLM-adjusted; 1s for normal APIs)* | **~7900 ms** | 🔴 slow |
| `/api/resume/active` | ≤ 500 ms | **~1300 ms** | 🟡 above bar |

**What it should be:** a normal JSON API p95 < 500 ms; even LLM-backed chat
should feel < 3 s or **stream** tokens so perceived latency is the *first* token,
not the last. **What it is:** chat p95 ~8 s as a single blocking response, and
the resume read ~1.3 s (a static-ish document that should be sub-second /
cache-warmed). Chat latency is dominated by the Bedrock RAG round-trip, so the
highest-value change is **streaming the response** (perceived latency drops to
hundreds of ms) rather than shaving model time.

---

## 5. Server runtime health (`nextjs_*`, now collected)

Restored this iteration (bearer-token scrape auth). Node.js runtime signals:

| Metric | What it should be | What the metric is | Rating |
|:-------|:------------------|:-------------------|:------:|
| Event-loop lag p90 | < 50 ms (good) / < 100 ms (ok) | **10 ms** | 🟢 Excellent |
| Heap used / total | < 80% of limit | 65 MB / 75 MB (RSS 128 MB vs 256 Mi limit ≈ 50%) | 🟢 Healthy |
| GC pause p95 | < 50 ms | **15 ms** | 🟢 Good |
| CPU (5 m rate) | headroom vs limit | 0.01 core (idle) | 🟢 Idle |

The runtime is healthy with ample headroom. Nothing to do here except keep the
scrape alive (guarded by the metrics-auth wiring and the observability alerts).

---

## 6. Observability coverage (meta-quality: can you *see* quality?)

| Signal | Should exist | Does exist | Gap |
|:-------|:-------------|:-----------|:----|
| RUM web vitals + rating + per-page | ✅ | ✅ | — |
| JS errors + exceptions + trace pivot | ✅ | ✅ (live Tempo table) | — |
| Client API latency/status | ✅ | ✅ (Faro fetch spans) | — |
| Server **HTTP RED** (rate/errors/duration) | ✅ | ❌ **defined but never incremented** | **see below** |
| Server runtime (mem/GC/loop/CPU) | ✅ | ✅ | — |
| Distributed traces (browser→SSR→admin-api) | ✅ | ✅ (Tempo) | — |
| Pipeline/alerting (receiver down, CWV) | ✅ | ✅ receiver alerts · ⚠️ no CWV-regression alert | minor |

**The one real coverage gap:** `metrics.ts` declares
`nextjs_api_calls_total`, `nextjs_api_errors_total`, and
`nextjs_http_request_duration_seconds`, but **no series exist live** — they are
registered and never observed, because App Router route handlers have no
instrumentation middleware calling them. So the server side reports **runtime
health but not request RED** (throughput, error rate, latency per route). This
is the highest-value observability follow-up: wire a small middleware/wrapper
that increments those on every `/api/*` handler.

---

## Prioritised actions (by leverage)

1. **CLS on article pages** (70% → target 95%+): reserve space for images,
   Mermaid, code blocks, and fonts. The per-page table now names the culprits.
2. **Stream `/api/chat`** (API latency 60% → 85%+): token streaming collapses
   perceived latency; the p95 stays high but the user sees output in ~hundreds
   of ms.
3. **Wire server HTTP RED** (coverage 80% → 95%): increment the already-defined
   counters/histogram in a route wrapper so throughput/error/latency per route
   become visible and alertable.
4. **Add a CWV-regression alert** so a future LCP/INP/CLS slide pages instead of
   waiting to be noticed on the dashboard.

## Related

- ["Frontend & RUM" dashboard — panel review & gaps](./frontend-rum-dashboard-review.md)
- [RUM & metrics pipeline — collection, scraping, flow to Grafana](../concepts/rum-metrics-pipeline.md)

<!--
Evidence trail (all live, 2026-07-04, portfolio-frontend / production / 7d):
- CWV p75: LCP 132ms, INP 120ms, CLS ~0 agg, TTFB 40ms, FCP 132ms (Loki quantile_over_time unwrap)
- CWV rating: LCP 100% good, INP 100% good, CLS 69.8% good / 25.6% ni / 4.7% poor
- CLS by page: worst article pages 0.44 / 0.30 / 0.24 / 0.16 / 0.10
- Volume: 26 sessions, 38 page loads, 1 JS error, errors/session 0.038
- Client API p95: /api/chat 7913ms, /api/resume/active 1261ms (Faro faro.tracing.fetch)
- Server: RSS 128MB, heap 65/75MB, eventloop lag p90 10ms, GC p95 15ms, CPU 0.01, up{nextjs-app}=1
- Coverage: nextjs_api_calls_total/nextjs_http_request_duration_seconds defined in metrics.ts, no live series
-->
