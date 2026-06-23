---
title: Rollout promotion exits early on a stale-Healthy rollout
type: troubleshooting
tags: [argo-rollouts, kubernetes, ci-cd, ssm, deployment]
sources:
  - .github/workflows/deploy-frontend.yml
created: 2026-06-23
updated: 2026-06-23
---

## Symptom

A deploy reports success, but the running site is still the **previous** image.
The promote step logs `Already Healthy — no promotion needed` and exits 0, and
the smoke test then verifies (and passes) against the wrong image.

## Root cause

The promotion script checks the rollout phase to decide whether to promote. If
it inspects the phase **before** ArgoCD Image Updater has synced the rollout
spec to the new tag, the rollout is still `Healthy` on the old image. A
`Healthy` phase triggers the "already done" early-exit
([deploy-frontend.yml:405](../../.github/workflows/deploy-frontend.yml#L405)),
so no promotion ever happens for the new image — a classic
check-before-the-state-has-changed race between an async reconciler (ArgoCD) and
a polling consumer (the CI step).

## How to diagnose

- In the promote job log, look for `Already Healthy` appearing immediately,
  with no preceding `ArgoCD synced new image` line.
- On a host with cluster access, compare the rollout's spec image to the tag you
  deployed:
  ```bash
  kubectl get rollout nextjs -n nextjs-app -o jsonpath='{.spec.template.spec.containers[0].image}'
  kubectl argo rollouts get rollout nextjs -n nextjs-app
  ```
  A mismatch (spec still on the old tag) with phase `Healthy` is the tell.

## How to fix

Gate the phase checks behind a "spec references the new tag" wait — "Step 0" in
the promote script
([deploy-frontend.yml:381-394](../../.github/workflows/deploy-frontend.yml#L381-L394)):
poll `spec.template…image` until it contains `EXPECTED_TAG` (up to ~5 min),
and only then enter the wait-for-`Paused` / promote logic. This is already in
place; if the early exit recurs, it means ArgoCD did not sync within the window
— investigate Image Updater rather than removing the gate.

## How to prevent

Never branch on a reconciled resource's status until you have confirmed the
desired spec is in place. Keep the Step-0 spec-sync wait ahead of any
phase-based decision, and fail (not exit 0) if the sync times out so a missed
promotion surfaces as a red pipeline.

<!--
Evidence trail (auto-generated):
- Source: .github/workflows/deploy-frontend.yml (read on 2026-06-23)
-->
