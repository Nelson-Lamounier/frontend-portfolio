---
title: Apply an RDS migration via an SSM tunnel
type: runbook
tags: [operations, rds, postgres, ssm, aws, migrations, kubernetes]
sources:
  - apps/site/src/lib/articles/public-api-articles.ts
created: 2026-06-23
updated: 2026-06-23
---

## When to run this

Use this to apply a single numbered SQL migration to the private platform RDS
when you cannot wait for, or need to verify ahead of, the normal path. The
sanctioned mechanism is the `platform-rds-bootstrap` Kubernetes Job (in the
`ai-applications` repo), which runs all numbered migrations idempotently on
deploy. This tunnel procedure is for ad-hoc or urgent application — e.g.
applying `101_article_engagement.sql` before the public-api routes that depend
on it serve traffic. The migration must be **idempotent** (`CREATE TABLE IF NOT
EXISTS`, etc.); only run it against the dev account.

## Prerequisites

- AWS profile for the **dev** account with SSM + RDS + Secrets Manager read
  (verified `Account 771826808455` on 2026-06-23).
- `session-manager-plugin` and `psql` installed locally.
- An SSM-managed EC2 node inside the platform VPC that can reach RDS on 5432
  (any running cluster node works).
- The migration `.sql` file checked out locally.

## Procedure

1. Verify the account and locate the RDS endpoint:
   ```bash
   export AWS_PROFILE=dev-account R=eu-west-1
   aws sts get-caller-identity --query Account --output text
   aws rds describe-db-instances --region $R \
     --query "DBInstances[0].{ep:Endpoint.Address,port:Endpoint.Port,public:PubliclyAccessible}" --output json
   ```

2. Find a running SSM-managed node to tunnel through:
   ```bash
   aws ssm describe-instance-information --region $R \
     --query "InstanceInformationList[?PingStatus=='Online'].InstanceId" --output text
   ```

3. Open a background port-forward from local `15440` to RDS `5432` via that node
   (pick a free local port to avoid clashing with any existing `kubectl
   port-forward`):
   ```bash
   aws ssm start-session --region $R --target <instance-id> \
     --document-name AWS-StartPortForwardingSessionToRemoteHost \
     --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["15440"]}'
   ```

4. Load the DB password into the environment without printing it:
   ```bash
   export PGPASSWORD="$(aws secretsmanager get-secret-value --region $R \
     --secret-id 'k8s-development/platform-rds/credentials' \
     --query SecretString --output text | python3 -c 'import sys,json;print(json.load(sys.stdin)["password"])')"
   export CONN="host=127.0.0.1 port=15440 dbname=tucaken user=postgres sslmode=require connect_timeout=5"
   ```

5. Apply the migration with `ON_ERROR_STOP` (SSL is required by RDS):
   ```bash
   psql "$CONN" -v ON_ERROR_STOP=1 -f path/to/NNN_migration.sql
   ```

6. Close the tunnel (stop the background session) when done.

## Verification

Confirm the objects exist, then prove idempotency by re-applying:

```bash
psql "$CONN" -tAc "select to_regclass('public.article_likes'), to_regclass('public.article_comments')"
psql "$CONN" -tAc "select indexname from pg_indexes where tablename in ('article_likes','article_comments') order by 1"
psql "$CONN" -v ON_ERROR_STOP=1 -f path/to/NNN_migration.sql   # must succeed unchanged
```

Verified on 2026-06-23 applying `101_article_engagement.sql`: both tables and
six indexes created, grants to `tucaken_app` present, and a second run completed
cleanly (idempotent).

## Rollback

These migrations are additive and idempotent, so the normal "undo" is to leave
them — re-running is safe. If a brand-new table must be removed and is confirmed
unused:

```bash
psql "$CONN" -c "DROP TABLE IF EXISTS article_comments, article_likes"
```

Never drop pre-existing tables, and never run destructive DDL against anything
but the dev account. For routine application prefer the `platform-rds-bootstrap`
Job rather than this manual path.

<!--
Evidence trail (auto-generated):
- Live: aws sts get-caller-identity / rds describe-db-instances / ec2 describe-security-groups (profile dev-account, 2026-06-23)
- Live: SSM AWS-StartPortForwardingSessionToRemoteHost to RDS via cluster node (2026-06-23)
- Live: psql apply + re-apply of 101_article_engagement.sql against db tucaken (2026-06-23) — idempotent, verified
- Context: platform-rds-bootstrap K8s Job runs numbered migrations on deploy (ai-applications repo)
-->
