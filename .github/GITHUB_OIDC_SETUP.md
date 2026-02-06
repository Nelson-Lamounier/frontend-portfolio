# GitHub Actions OIDC Configuration Guide

This guide explains how to configure AWS OIDC authentication and environment variables in GitHub for the CDK monitoring deployment pipelines.

---

## Overview

The deployment pipelines use **GitHub OIDC** (OpenID Connect) for secure, keyless authentication to AWS. This eliminates the need for long-lived AWS access keys.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GitHub Repository                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Environments:                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  development │    │   staging    │    │  production  │                   │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤                   │
│  │ Secrets:     │    │ Secrets:     │    │ Secrets:     │                   │
│  │ DEV_AWS_     │    │ AWS_OIDC_    │    │ AWS_OIDC_    │                   │
│  │ OIDC_ROLE    │    │ ROLE_STAGING │    │ ROLE_PROD    │                   │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤                   │
│  │ Variables:   │    │ Variables:   │    │ Variables:   │                   │
│  │ AWS_ACCOUNT_ │    │ AWS_ACCOUNT_ │    │ AWS_ACCOUNT_ │                   │
│  │ ID_DEV       │    │ ID_STAGING   │    │ ID_PROD      │                   │
│  │ AWS_REGION   │    │ AWS_REGION   │    │ AWS_REGION   │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AWS Accounts                                      │
├──────────────────┬──────────────────┬──────────────────────────────────────┤
│    DEV Account   │  STAGING Account │       PROD Account                   │
│    (111111111111)│  (222222222222)  │       (333333333333)                 │
├──────────────────┼──────────────────┼──────────────────────────────────────┤
│  OIDC Provider   │  OIDC Provider   │       OIDC Provider                  │
│  → Trust Policy  │  → Trust Policy  │       → Trust Policy                 │
│  → IAM Role      │  → IAM Role      │       → IAM Role                     │
│  (GitHubActions- │  (GitHubActions- │       (GitHubActions-                │
│   CDK-Dev)       │   CDK-Staging)   │        CDK-Prod)                     │
└──────────────────┴──────────────────┴──────────────────────────────────────┘
```

---

## Step 1: Create GitHub Environments

Navigate to: **Repository → Settings → Environments**

Create 3 environments with these exact names (matching the workflow `environment:` values):

| Environment Name | Branch Protection | Required Reviewers |
|------------------|-------------------|-------------------|
| `development`    | Optional          | None              |
| `staging`        | Recommended       | Optional          |
| `production`     | **Required**      | **Recommended**   |

### Production Environment Protection (Recommended)

For `production` environment, enable:
- ✅ Required reviewers (add team leads)
- ✅ Deployment branches: Only `main`
- ✅ Wait timer: 5 minutes (optional)

---

## Step 2: Configure Environment Secrets

Navigate to: **Repository → Settings → Environments → [environment] → Environment secrets**

### Development Environment Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DEV_AWS_OIDC_ROLE` | `arn:aws:iam::111111111111:role/GitHubActions-CDK-Dev` | IAM Role ARN for dev |

### Staging Environment Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_OIDC_ROLE_STAGING` | `arn:aws:iam::222222222222:role/GitHubActions-CDK-Staging` | IAM Role ARN for staging |

### Production Environment Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_OIDC_ROLE_PROD` | `arn:aws:iam::333333333333:role/GitHubActions-CDK-Prod` | IAM Role ARN for prod |

> **Note:** Replace `111111111111`, `222222222222`, `333333333333` with your actual AWS account IDs.

---

## Step 3: Configure Environment Variables

Navigate to: **Repository → Settings → Environments → [environment] → Environment variables**

### Development Environment Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `AWS_ACCOUNT_ID_DEV` | `111111111111` | Dev AWS account ID |
| `AWS_REGION` | `eu-west-1` | AWS region for deployment |

### Staging Environment Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `AWS_ACCOUNT_ID_STAGING` | `222222222222` | Staging AWS account ID |
| `AWS_REGION` | `eu-west-1` | AWS region for deployment |

### Production Environment Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `AWS_ACCOUNT_ID_PROD` | `333333333333` | Prod AWS account ID |
| `AWS_REGION` | `eu-west-1` | AWS region for deployment |

---

## Step 4: AWS IAM Configuration

### 4.1 Create OIDC Identity Provider (Once Per AWS Account)

In **each AWS account**, create an OIDC identity provider:

**AWS Console:** IAM → Identity providers → Add provider

| Field | Value |
|-------|-------|
| Provider type | OpenID Connect |
| Provider URL | `https://token.actions.githubusercontent.com` |
| Audience | `sts.amazonaws.com` |

**AWS CLI:**
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --client-id-list sts.amazonaws.com
```

### 4.2 Create IAM Role (Each AWS Account)

Create an IAM role with trust policy allowing GitHub OIDC.

**Trust Policy (IAM Role → Trust relationships):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/cdk-monitoring:environment:ENVIRONMENT_NAME"
        }
      }
    }
  ]
}
```

**Replace:**
- `ACCOUNT_ID` → Your AWS account ID
- `YOUR_ORG` → Your GitHub organization/username
- `ENVIRONMENT_NAME` → `development`, `staging`, or `production`

### Trust Policy Examples

#### Development Account Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Nelson-Lamounier/cdk-monitoring:environment:development"
        }
      }
    }
  ]
}
```

#### Production Account Trust Policy (More Restrictive)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::333333333333:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:Nelson-Lamounier/cdk-monitoring:environment:production"
        }
      }
    }
  ]
}
```

### 4.3 IAM Role Permissions

Attach policies to allow CDK deployments:

**Minimum Required Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKDeployment",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "ec2:*",
        "iam:*",
        "logs:*",
        "ssm:*",
        "kms:*",
        "s3:*",
        "sts:AssumeRole"
      ],
      "Resource": "*"
    }
  ]
}
```

> **⚠️ Security:** In production, scope down permissions to specific resources and actions.

---

## Step 5: Workflow Secret Mapping

Here's how the workflows reference your secrets:

| Workflow | Secret Reference | GitHub Secret Name |
|----------|-----------------|-------------------|
| `deploy-monitoring-dev.yml` | `${{ secrets.DEV_AWS_OIDC_ROLE }}` | `DEV_AWS_OIDC_ROLE` |
| `deploy-monitoring-staging.yml` | `${{ secrets.AWS_OIDC_ROLE_STAGING }}` | `AWS_OIDC_ROLE_STAGING` |
| `deploy-monitoring-prod.yml` | `${{ secrets.AWS_OIDC_ROLE_PROD }}` | `AWS_OIDC_ROLE_PROD` |

| Workflow | Variable Reference | GitHub Variable Name |
|----------|-------------------|---------------------|
| `deploy-monitoring-dev.yml` | `${{ vars.AWS_ACCOUNT_ID_DEV }}` | `AWS_ACCOUNT_ID_DEV` |
| `deploy-monitoring-staging.yml` | `${{ vars.AWS_ACCOUNT_ID_STAGING }}` | `AWS_ACCOUNT_ID_STAGING` |
| `deploy-monitoring-prod.yml` | `${{ vars.AWS_ACCOUNT_ID_PROD }}` | `AWS_ACCOUNT_ID_PROD` |

---

## Quick Setup Checklist

### GitHub Configuration

- [ ] **development** environment created
  - [ ] Secret: `DEV_AWS_OIDC_ROLE`
  - [ ] Variable: `AWS_ACCOUNT_ID_DEV`
  - [ ] Variable: `AWS_REGION`

- [ ] **staging** environment created
  - [ ] Secret: `AWS_OIDC_ROLE_STAGING`
  - [ ] Variable: `AWS_ACCOUNT_ID_STAGING`
  - [ ] Variable: `AWS_REGION`

- [ ] **production** environment created
  - [ ] Secret: `AWS_OIDC_ROLE_PROD`
  - [ ] Variable: `AWS_ACCOUNT_ID_PROD`
  - [ ] Variable: `AWS_REGION`
  - [ ] Required reviewers configured
  - [ ] Deployment branch protection enabled

### AWS Configuration (Per Account)

- [ ] OIDC Identity Provider created
- [ ] IAM Role created with:
  - [ ] Trust policy for GitHub OIDC
  - [ ] Condition restricting to specific environment
  - [ ] CDK deployment permissions attached

---

## Troubleshooting

### "Could not assume role" Error

1. Verify OIDC provider exists in AWS account
2. Check trust policy `sub` condition matches exactly:
   - Format: `repo:ORG/REPO:environment:ENV_NAME`
   - Environment names are case-sensitive
3. Ensure the GitHub workflow specifies `id-token: write` permission

### "Access Denied" During Deployment

1. Check IAM role has required permissions
2. Verify CDK bootstrap was run in the target account/region:
   ```bash
   npx cdk bootstrap aws://ACCOUNT_ID/REGION
   ```

### Secret/Variable Not Found

1. Verify secret is created in the correct environment (not repository level)
2. Check secret name matches exactly (case-sensitive)
3. Ensure workflow references correct environment name
