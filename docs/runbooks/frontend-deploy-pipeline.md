---
title: Frontend deploy pipeline (Argo Rollouts blue-green via SSM)
type: runbook
tags: [operations, ci-cd, argo-rollouts, kubernetes, aws, ecr, cloudfront, ssm, github-actions]
sources:
  - .github/workflows/deploy-frontend.yml
created: 2026-06-23
updated: 2026-06-23
---

## When to run this

The pipeline runs automatically on push to the deploy branch, via
`workflow_dispatch`, or via `repository_dispatch` from an upstream
infrastructure pipeline
([deploy-frontend.yml:20-31](../../.github/workflows/deploy-frontend.yml#L20-L31)).
Use this doc to understand the stages, to dispatch a manual deploy, or to
intervene when a rollout stalls.

## Prerequisites

- A GitHub OIDC role assumable by the workflow (`secrets.AWS_OIDC_ROLE`); no
  static AWS keys.
- SSM parameters present: the shared ECR repository URI and the per-environment
  image URI / kubeconfig parameters the jobs read and write.
- A running control-plane EC2 node (tagged for discovery) reachable via SSM, and
  an in-cluster `k8s-runner` GitHub Actions runner for the smoke test.
- The `nextjs` Argo Rollout in namespace `nextjs-app`
  ([deploy-frontend.yml:369-370](../../.github/workflows/deploy-frontend.yml#L369-L370)).

## Procedure

The workflow executes these jobs in order
([deploy-frontend.yml:53-616](../../.github/workflows/deploy-frontend.yml#L53-L616)):

1. **resolve-targets** — decide whether the site should deploy.
2. **build-site** — build the Docker image and extract the static Next.js
   assets for S3.
3. **push-site** — resolve the ECR URL from SSM and push the image.
4. **sync-assets** — sync the extracted static assets to S3/CloudFront.
5. **deploy-site** — write the promoted image URI to SSM.
6. **promote-site** — over an SSM `AWS-RunShellScript` document
   ([deploy-frontend.yml:443](../../.github/workflows/deploy-frontend.yml#L443)),
   wait for ArgoCD Image Updater to set the rollout spec to the new tag, wait
   for the rollout to reach `Paused`, then run `kubectl argo rollouts promote`
   ([deploy-frontend.yml:421](../../.github/workflows/deploy-frontend.yml#L421)).
   It must not enter the Paused loop until the spec already references the new
   tag, or a still-`Healthy` (old image) rollout causes an early exit.
7. **smoke-site** — on the in-cluster `k8s-runner`, build a kubeconfig from SSM
   (rewriting the API server to `kubernetes.default.svc`)
   ([deploy-frontend.yml:519](../../.github/workflows/deploy-frontend.yml#L519))
   and assert the rollout phase is `Healthy` and the active image matches the
   deployed tag
   ([deploy-frontend.yml:527-528](../../.github/workflows/deploy-frontend.yml#L527-L528)).

To trigger manually: run the workflow via `workflow_dispatch` from the Actions
tab.

## Verification

The smoke-site job is the built-in verification. To check by hand from a host
with cluster access:

```bash
kubectl argo rollouts get rollout nextjs -n nextjs-app
kubectl get rollout nextjs -n nextjs-app -o jsonpath='{.status.phase}'
```

A successful deploy ends with the rollout `Healthy` and the active image
referencing the new tag.

## Rollback

The promote job aborts automatically if the rollout reports `Degraded` or
`Error`. To roll back manually:

```bash
kubectl argo rollouts undo nextjs -n nextjs-app
kubectl argo rollouts get rollout nextjs -n nextjs-app   # confirm Healthy on prior revision
```

Because the strategy is blue-green, aborting before promotion keeps the stable
(previous) ReplicaSet serving traffic, so a failed candidate never takes over.

## Deeper detail

- (planned) docs/concepts/blue-green-rollout-via-ssm.md — why promotion is
  driven over SSM Run Command and the Paused-loop race it avoids
- (planned) docs/troubleshooting/rollout-stale-healthy-early-exit.md

<!--
Evidence trail (auto-generated):
- Source: .github/workflows/deploy-frontend.yml (read on 2026-06-23)
-->
