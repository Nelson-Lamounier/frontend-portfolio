---
title: Frontend deploy pipeline (GitHub Actions → ECR → ArgoCD blue-green)
type: runbook
tags: [operations, ci-cd, github-actions, ecr, ssm, argocd, argo-rollouts, kubernetes, s3]
sources:
  - .github/workflows/deploy-frontend.yml
  - .github/workflows/_sync-assets.yml
created: 2026-06-23
updated: 2026-07-04
---

## When to run this

The [`deploy-frontend.yml`](../../.github/workflows/deploy-frontend.yml) pipeline
is GitHub-led: it builds and publishes the image, then hands off to ArgoCD (see
[CD pipeline](../concepts/cd-pipeline.md) for the design). It runs on
([deploy-frontend.yml:21-34](../../.github/workflows/deploy-frontend.yml#L21-L34)):

- a **push to `main`** (normally a merged PR) — auto-deploys to development;
- **`workflow_dispatch`** — a manual run with an optional `frontend-ref`;
- **`repository_dispatch`** (`deploy-nextjs-dev`) — a cross-repo trigger.

Use this doc to understand the stages, dispatch a manual deploy, or intervene when
a rollout stalls.

## Prerequisites

- A GitHub OIDC role assumable by the workflow (`secrets.AWS_OIDC_ROLE`); no
  static AWS keys ([configure-aws/action.yml](../../.github/actions/configure-aws/action.yml)).
- SSM parameters present: the shared ECR repository URI
  (`/shared/ecr/<env>/repository-uri`) which the jobs read, and the per-environment
  image URI (`/nextjs/<env>/image-uri`) which `deploy-site` writes.
- **In the cluster** (not GitHub's concern): ArgoCD Image Updater watching the
  `nextjs` image, and the `nextjs` Argo Rollout in its namespace configured for
  blue-green with auto-promotion.

## Procedure — the GitHub-led jobs

The workflow runs six jobs in order
([deploy-frontend.yml:51-361](../../.github/workflows/deploy-frontend.yml#L51-L361)):

1. **resolve-targets** — resolve the git ref to deploy
   ([:55-76](../../.github/workflows/deploy-frontend.yml#L55-L76)).
2. **build-site** — build the Docker image (Buildx + GHA cache) and extract the
   Next.js static assets for the S3 sync. The image tag is
   `${github.sha}-r${run_attempt}` so retries never overwrite an ECR tag
   ([:85-170](../../.github/workflows/deploy-frontend.yml#L85-L170)).
3. **push-site** — assume the OIDC role, resolve the ECR URI from SSM, push the
   image ([:175-242](../../.github/workflows/deploy-frontend.yml#L175-L242)).
4. **sync-assets** — the reusable
   [`_sync-assets.yml`](../../.github/workflows/_sync-assets.yml) uploads static
   assets to S3. (CloudFront has been retired and its invalidation step removed;
   the pod serves static assets directly, so this sync is outside the request path)
   ([:247-257](../../.github/workflows/deploy-frontend.yml#L247-L257)).
5. **deploy-site** — write the new image URI to `/nextjs/<env>/image-uri` in SSM.
   **This is the hand-off to ArgoCD**
   ([:262-313](../../.github/workflows/deploy-frontend.yml#L262-L313)).
6. **summary** — report per-stage results
   ([:319-361](../../.github/workflows/deploy-frontend.yml#L319-L361)).

After job 5, GitHub's work is done. **ArgoCD Image Updater** detects the new tag
and **Argo Rollouts auto-promotes** the blue-green cutover in-cluster — there is
no GitHub-driven `promote` or in-cluster smoke step.

To trigger manually: run the workflow via `workflow_dispatch` from the Actions
tab (optionally set `frontend-ref`).

## Verification

The GitHub side is verified by the pipeline itself: a green `summary` job means
the image is in ECR, static assets are synced to S3, and the SSM parameter is
updated. To confirm the **in-cluster** rollout from a host with cluster access:

```bash
# Is the SSM hand-off value what you expect?
aws ssm get-parameter --name /nextjs/development/image-uri --query 'Parameter.Value' --output text

# Did ArgoCD/Argo Rollouts promote it?
kubectl argo rollouts get rollout nextjs -n nextjs-app
kubectl get rollout nextjs -n nextjs-app -o jsonpath='{.status.phase}{"\n"}'
kubectl get rollout nextjs -n nextjs-app -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

A successful deploy ends with the rollout `Healthy` and the active image
referencing the tag GitHub pushed.

## Rollback

Because GitHub only publishes the artifact, rollback happens on the cluster side.
Blue-green keeps the previous (stable) ReplicaSet serving until promotion, so a
failed candidate never takes over. To roll back a completed promotion:

```bash
kubectl argo rollouts undo nextjs -n nextjs-app
kubectl argo rollouts get rollout nextjs -n nextjs-app   # confirm Healthy on prior revision
```

To redeploy a known-good build, re-run the workflow via `workflow_dispatch` with
that commit's `frontend-ref`.

## Troubleshooting

- **Green pipeline but ArgoCD didn't promote** — check ArgoCD Image Updater is
  running and watching the repository, and that `/nextjs/<env>/image-uri` holds
  the new tag. The hand-off is asynchronous; GitHub reports success once SSM is
  written, not once the rollout is Healthy.
- **ECR push denied** — confirm `AWS_OIDC_ROLE` and that
  `/shared/ecr/<env>/repository-uri` resolves
  ([:209-223](../../.github/workflows/deploy-frontend.yml#L209-L223)).

## Related

- [CD pipeline](../concepts/cd-pipeline.md) — the GitHub-leads / ArgoCD-follows design
- [CI pipeline & branch strategy](../concepts/ci-pipeline.md) — what runs before a merge to `main`

<!--
Evidence trail:
- Source: .github/workflows/deploy-frontend.yml (read 2026-07-04) — 6 jobs; promote-site & smoke-site removed (PRs #9, #10)
- Source: .github/workflows/_sync-assets.yml (read 2026-07-04)
-->
