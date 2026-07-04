---
title: Request routing — how a visitor reaches the EKS pod
type: concept
tags: [routing, dns, route53, alb, ingress, eks, kubernetes, aws-load-balancer-controller, tls, vpc-cni]
sources:
  - Live AWS (development account, eu-west-1) verified 2026-07-04
  - docs/concepts/in-cluster-bff-consumer.md
created: 2026-07-04
updated: 2026-07-04
---

## Overview

This documents the **inbound request path** for the live site — how a visitor's
browser gets from typing `nelsonlamounier.com` to a response served by the
`nextjs` pod running on the EKS cluster. The design goal is a single, simple,
per-pod-health-aware ingress path with **one hop from the load balancer straight
to the pod** and no CDN tier.

> There is **no CloudFront** in front of the site. An earlier design offloaded
> static assets to S3 + CloudFront; that CDN tier has been retired. The Next.js
> pod is now the single origin for both HTML and static assets.

## The request path

```mermaid
flowchart LR
  User([Visitor browser]) -->|1. DNS lookup<br/>nelsonlamounier.com| R53["Route 53<br/>public hosted zone"]
  R53 -->|ALIAS → ALB| User
  User -->|2. HTTPS :443| ALB["Internet-facing ALB<br/>(shared 'public' IngressGroup)"]
  ALB -->|3. TLS terminate + host-header match| Rule{"Host =<br/>nelsonlamounier.com?"}
  Rule -->|forward| TG["Target group<br/>type: ip · port 3000 · /api/health"]
  TG -->|4. direct to pod IP<br/>(VPC CNI)| Pod["nextjs pod<br/>Next.js standalone :3000"]
  Pod -->|5a. server-side data| BFF["public-api BFF<br/>(api.nelsonlamounier.com / in-cluster DNS)"]
  Pod -->|5b. HTML + /_next/static| User
```

## Step by step

### 1. DNS — Route 53

The domain is registered and its **public DNS is served by AWS Route 53**. The
apex host `nelsonlamounier.com` is an **ALIAS record** pointing at the
internet-facing Application Load Balancer.

- **Why Route 53 + ALIAS:** ALIAS records resolve an apex domain straight to an
  AWS load balancer (something a plain `CNAME` can't do at the zone apex), at no
  per-query charge, and Route 53 updates automatically if the ALB's addresses
  change.
- **Multi-account DNS:** the public `nelsonlamounier.com` zone is managed in a
  separate account of the AWS Organization; the workload account holds only a
  **private** `k8s.internal` zone (which carries records such as the private EKS
  API endpoint). This is why the cluster's Kubernetes API is not reachable from
  the public internet — it resolves and lives inside the VPC.

### 2. Internet-facing Application Load Balancer

DNS resolves to a single **internet-facing ALB** that is shared across every
public host. It is provisioned declaratively by the **AWS Load Balancer
Controller** from a shared `public` IngressGroup — the site's Kubernetes Ingress
is one member of that group, so it does not get its own load balancer.

- **Why one shared ALB:** every public host (the site, the `public-api`, the
  ops/observability tools, other apps) is a rule on **one** load balancer instead
  of one ALB each — a single TLS endpoint, a single DNS target, and far lower
  cost. The Ingress objects stay in Kubernetes and are reconciled into ALB
  listener rules automatically.

### 3. TLS termination + host-based routing

The ALB exposes **HTTPS on port 443** and **terminates TLS** using an
AWS Certificate Manager (ACM) certificate. Routing is **host-header based**: each
public hostname maps to its own Kubernetes Service via a listener rule —
`nelsonlamounier.com` forwards to the site's target group, `api.nelsonlamounier.com`
to the `public-api` BFF, and so on. A request whose `Host` matches no rule gets a
fixed **HTTP 404** rather than being routed anywhere.

- **Why terminate TLS at the ALB:** certificates are managed and auto-renewed by
  ACM and never live in the application pods; the app speaks plain HTTP inside the
  VPC. Host-based rules keep unrelated apps isolated on a shared entry point.

### 4. ALB → pod, in one hop (IP target mode)

This is the key EKS routing decision. The site's target group is registered in
**IP target mode**, and the pods run with the **Amazon VPC CNI**, which gives
every pod a routable VPC IP. So the ALB forwards **directly to the `nextjs` pod's
IP** on container port **3000** — there is no `NodePort`, no `kube-proxy`
second-hop, and no in-cluster load-balancer tier. The ALB health-checks each pod
at **`/api/health`** and only sends traffic to pods that pass.

- **Why IP mode:** fewer network hops and lower latency (LB → pod, not LB → node →
  kube-proxy → pod); **per-pod health** at the load balancer; and clean, fast
  registration/deregistration of individual pods — which is exactly what the
  blue-green rollout relies on when it shifts traffic between ReplicaSets (see
  [CD pipeline](./cd-pipeline.md)).

### 5. The Next.js pod serves the response

The `nextjs` pod runs the **Next.js standalone server** on port 3000. It renders
App Router routes server-side and **serves its own static assets** (`/_next/static`,
`public/`) — the pod is the origin for HTML *and* static files. For dynamic data
(articles, chat, resume, engagement) it calls the in-cluster `public-api` BFF
server-side; the browser only ever talks to the site's own origin. That data path
is documented in
[in-cluster BFF consumer architecture](./in-cluster-bff-consumer.md).

## Why there is no CDN (CloudFront retired)

CloudFront has been removed; there are no CloudFront distributions in front of the
site. The Next.js pod serves both HTML and static assets directly behind the ALB.

- **Simpler single origin:** one place serves everything — no separate S3/CDN
  origin, no cache-invalidation choreography on deploy, and no split-brain between
  "HTML from the pod" and "assets from a CDN".
- **The workload suits it:** the site is small and already benefits from Next.js
  ISR caching at the pod, hashed immutable `/_next/static` filenames, and the
  shared ALB in front — so a global CDN tier added operational surface without a
  matching payoff for this site.
- **Note on the pipeline:** the deploy workflow still runs a static-asset **S3
  sync** step (the CloudFront invalidation has been removed). With CloudFront
  retired and the pod serving assets, the S3 sync itself is outside the request
  path and a candidate for removal — see [CD pipeline](./cd-pipeline.md).

## Design decisions at a glance

| Decision | Choice | Why |
| --- | --- | --- |
| Public DNS | Route 53, apex **ALIAS** → ALB | Apex-to-ALB resolution, no per-query cost, auto-tracks ALB |
| DNS accounts | Public zone in a separate org account; private `k8s.internal` in the workload account | Keeps the cluster API private, off the public internet |
| Load balancer | One shared internet-facing ALB via `public` IngressGroup | One TLS endpoint + one DNS target for all hosts; lower cost |
| LB provisioning | AWS Load Balancer Controller from Kubernetes Ingress | Ingress-as-code; rules reconciled automatically |
| TLS | Terminated at the ALB with an ACM certificate | Managed auto-renewal; no certs in pods |
| Routing | Host-header rules; unmatched → 404 | Multi-tenant isolation on a shared entry point |
| LB → pod | **IP target mode** over the VPC CNI, port 3000 | One hop LB→pod, per-pod health, fast blue-green shifts |
| Static assets | Served by the Next.js pod (no CloudFront) | Single origin; simpler deploys; fits a small, ISR-cached site |

## Related

- [CD pipeline](./cd-pipeline.md) — how the image behind this pod is built and shipped
- [In-cluster BFF consumer architecture](./in-cluster-bff-consumer.md) — the
  server-side data path from the pod
- [/api/metrics endpoint](../tools/metrics-endpoint.md) — the pod's authenticated
  metrics surface

<!--
Evidence trail:
- Route 53: dev-account holds only private zone k8s.internal (k8s-api.k8s.internal A). Public zone elsewhere. (verified 2026-07-04)
- CloudFront: list-distributions == null (no distributions). (verified 2026-07-04)
- ALB k8s-public-f8655bfb7e: internet-facing, single HTTPS:443 listener, TLS via 1 ACM cert, default fixed-response 404. (verified 2026-07-04)
- Host rule priority 12: nelsonlamounier.com -> target group k8s-nextjsap-nextjs. (verified 2026-07-04)
- Target group k8s-nextjsap-nextjs: TargetType=ip, Port=3000, HealthCheckPath=/api/health. (verified 2026-07-04)
-->
