---
title: Pin public project routes to the owner's user id, not a GitHub username
type: decision
tags: [security, bff, multi-tenancy, architecture]
sources:
  - apps/site/src/lib/projects/public-api-projects.ts
created: 2026-07-05
updated: 2026-07-05
---

## Status

Accepted (2026-07-05). Spans three repositories: ai-applications PR #414
(BFF routes), kubernetes-bootstrap PR #226 (env), frontend-portfolio PR #48
(consumer).

## Context

The `/projects` grid consumes Tucaken-generated projects from the shared
`public-api` BFF. The platform is multi-user: any user can sync
repositories and publish projects. The first design keyed the portfolio's
list on a GitHub username (`GET /public/projects/:username`), with the
username supplied by a frontend env var.

Two facts make username keying unsafe as an isolation boundary. The
`oauth_connections` table is `UNIQUE (user_id, provider)` — the `username`
column is **not** unique, so two user rows can legitimately carry the same
GitHub handle (verified against the platform's bootstrap schema on
2026-07-05). And GitHub usernames can be renamed and reclaimed by other
people, so even an initially-unique handle is not a stable identity. A
username-keyed public list could therefore mix another user's public
projects into the portfolio UI. A misconfigured frontend env var would do
the same silently.

## Decision

The portfolio consumes owner-pinned routes — `GET /api/projects` and
`GET /api/projects/:slug` — that the BFF filters by
`PORTFOLIO_OWNER_USER_ID` (its own in-cluster config; an internal
`users.id`). The frontend names no identity at all: no username, no user
id, nothing to misconfigure
([adapter header](../../apps/site/src/lib/projects/public-api-projects.ts)).
The routes fail closed: an unset owner env yields an empty list / 404
without executing any query. The multi-user share route
(`/public/projects/:username/:slug`) remains for the Tucaken product's
recruiter-share links, where username-in-URL is the point.

## Consequences

Isolation lives in exactly one place — the BFF's deployment config — and
is enforced in SQL (`p.user_id = $1 AND visibility = 'public'`). Another
user's projects cannot reach this UI regardless of frontend configuration.
The cost: the owner id must be provisioned per environment
(kubernetes-bootstrap chart value), and the frontend cannot render another
user's portfolio without a BFF change — acceptable, since this is a
single-owner site by design.

## Alternatives considered

- **Keep username keying with a frontend env** — rejected: usernames are
  not unique in the schema and not stable on GitHub; the frontend env is a
  silent misconfiguration vector.
- **Pass the owner user id from the frontend** — rejected: moves the
  isolation key to the least-trusted layer and exposes an internal id in
  site config for no benefit.
- **RLS with a session GUC** — rejected for this surface: public-api reads
  bypass the RLS session model (no authenticated user), and the
  route-layer SQL filter is the established pattern for public visibility
  gates in this platform.

<!--
Evidence trail (auto-generated):
- Source: apps/site/src/lib/projects/public-api-projects.ts (read on 2026-07-05)
- Cross-repo: ai-applications api/public-api/src/routes/projects.ts + lib/config.ts (read on 2026-07-05, PR #414)
- Cross-repo: kubernetes-bootstrap charts/public-api (PR #226)
- Schema: oauth_connections UNIQUE(user_id, provider) — ai-applications applications/platform-rds-bootstrap/src/bootstrap.ts:41-51 (read on 2026-07-05)
-->
