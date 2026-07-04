---
title: Local dev & cluster access (networking troubleshooting)
type: troubleshooting
tags: [troubleshooting, kubectl, eks, sso, port-forward, networking, bff, local-dev]
sources:
  - justfile
  - apps/site/src/lib/articles/public-api-articles.ts
created: 2026-07-04
updated: 2026-07-04
---

## When to use this

You need **real dev data** (articles, chat, resume, likes/comments) while
developing or debugging, or the live site is returning empty lists / chat errors
and you suspect the data path. Because the site is a pure consumer, "getting real
data locally" means reaching the in-cluster `public-api` BFF — which lives inside
the private VPC. The tool for that is `just site-rds`.

> **The model:** the frontend never talks to RDS. Only the in-cluster `public-api`
> BFF does. To debug against real data you **port-forward the BFF** to localhost
> and point `PUBLIC_API_URL` at the tunnel. Reads are safe; likes/comments write
> to the real dev RDS. See [BFF consumer architecture](../concepts/in-cluster-bff-consumer.md).

## Prerequisites

- **SSO logged in:** `aws sso login --profile dev-account`
- **kube context** pointing at the dev cluster: `k8s-eks-development`
  (`eu-west-1`). Check with `kubectl config current-context`.
- **Network access to the cluster API.** The EKS API is private/restricted, so
  `kubectl` only connects from an authorized network (VPN / allowlisted egress).
  If `kubectl` hangs, that is usually the cause (see below).

## How cluster access works (`just site-rds`)

The [`site-rds` recipe](../../justfile) does exactly this, so you rarely run the
raw commands — but knowing them is the point of this doc:

```bash
# 1. Forward the in-cluster BFF service to localhost:3001
AWS_PROFILE=dev-account AWS_REGION=eu-west-1 \
  kubectl port-forward -n public-api svc/public-api 3001:3001

# 2. Confirm the tunnel serves data
curl -sf -m 2 http://localhost:3001/api/articles

# 3. Run next dev pointed at the tunnel (the recipe does this for you)
PUBLIC_API_URL=http://localhost:3001 yarn workspace site dev
```

`just site-rds` wraps all three: it starts the port-forward in the background,
polls `/api/articles` until the tunnel is live (failing fast with the
port-forward log if it dies), then runs `next dev` with `PUBLIC_API_URL` set.
Ctrl+C stops both.

Run `just site-rds` and open <http://localhost:3000>.

## Common failures

### `kubectl` hangs / "Unable to connect… context deadline exceeded"

**Cause:** no network route to the private EKS API, an expired SSO token, or the
wrong context.

**Diagnose & fix:**

```bash
kubectl config current-context      # must be k8s-eks-development
aws sts get-caller-identity --profile dev-account   # empty/error → SSO expired
aws sso login --profile dev-account # re-authenticate
```

Then confirm you are on the network authorized to reach the API (VPN / allowlisted
IP). `kubectl` needs the API endpoint; being SSO-logged-in is necessary but not
sufficient.

### Port-forward dies immediately

**Symptom:** `just site-rds` prints "port-forward died — check kube context + SSO"
and dumps `/tmp/public-api-pf.log`.

**Cause & fix:** almost always SSO/context (above), or the `public-api` service
isn't running. Verify the service exists and has endpoints:

```bash
kubectl get svc -n public-api public-api
kubectl get pods -n public-api -l app=public-api
kubectl get endpoints -n public-api public-api   # empty → no ready pods
```

### `address already in use` on port 3001

**Cause:** a previous port-forward is still running.

**Fix:**

```bash
lsof -ti :3001 | xargs kill        # free the port
# or run on another port:
just site-rds dev-account eu-west-1 3002
```

### Articles empty / resume 204 / chat 502–504 (even via the tunnel)

The site **degrades gracefully** — reads return `[]`/`null` and the resume route
returns `204` when the BFF is unreachable
([public-api-articles.ts:138-147](../../apps/site/src/lib/articles/public-api-articles.ts#L138-L147)),
so an empty page often means "BFF not reachable", not "no data". Check the tunnel
directly:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/articles   # 200?
curl -s http://localhost:3001/api/articles | head
```

- Non-200 from the tunnel → the BFF or its RDS connection is the problem (inspect
  `public-api` pod logs: `kubectl logs -n public-api -l app=public-api --tail=100`).
- `/api/chat` 502/504 from the site but 200 at the BFF → the site→BFF hop or a
  timeout; the site aborts at 30s (see [chat proxy](../concepts/bedrock-rag-proxy.md)).

### Chat connects but answers are generic / ungrounded

That is a **retrieval/grounding** issue on the backend (owner-id scoping, corpus,
VPC), not the frontend proxy. See [chatbot architecture](../concepts/chatbot-architecture.md);
the fix lives in the `ai-applications` repo.

## Verify

A healthy local-against-real-data session looks like:

```bash
kubectl config current-context      # k8s-eks-development
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/articles   # 200
# browser: http://localhost:3000 shows real articles, chat responds
```

## Cluster command reference

```bash
# Identity / context
kubectl config current-context
aws sts get-caller-identity --profile dev-account

# BFF (data plane)
kubectl get svc,pods,endpoints -n public-api
kubectl logs -n public-api -l app=public-api --tail=100 -f

# The site's own rollout (deploy issues)
kubectl argo rollouts get rollout nextjs -n nextjs-app
kubectl get rollout nextjs -n nextjs-app -o jsonpath='{.status.phase}{"\n"}'
```

For deploy/rollout problems specifically, use the
[frontend deploy pipeline runbook](../runbooks/frontend-deploy-pipeline.md).

## Related

- [Troubleshooting guide & automation](./README.md)
- [In-cluster BFF consumer architecture](../concepts/in-cluster-bff-consumer.md)
- [Request routing — DNS to EKS pod](../concepts/request-routing-dns-to-pod.md)

<!--
Evidence trail:
- justfile site-rds recipe (read 2026-07-04): kubectl port-forward -n public-api svc/public-api 3001:3001; polls /api/articles; runs next dev with PUBLIC_API_URL
- Cluster facts verified 2026-07-04 (dev-account): context k8s-eks-development (eu-west-1); public-api namespace/service; nextjs rollout in nextjs-app; EKS API private (k8s.internal)
- Graceful degradation: public-api-articles.ts returns [] / null on unreachable BFF
-->
