#!/bin/bash

# Commit 1
git add yarn.lock package.json apps/start-admin/package.json apps/start-admin/vitest.config.ts apps/start-admin/eslint.config.js 2>/dev/null || true
git commit -m "chore: update dependencies and typescript configuration" || true

# Commit 2
git add apps/site/.next apps/admin/.next 2>/dev/null || true
git commit -m "build: track Next.js site compilation artifacts" || true

# Commit 3
git add apps/start-admin/Dockerfile scripts/ REVIEW_REPORT.md 2>/dev/null || true
git commit -m "feat(infrastructure): add Docker configuration and deployment scripts" || true

# Commit 4
git add apps/start-admin/src/app/__root.tsx apps/start-admin/src/app/_dashboard.tsx apps/start-admin/src/routeTree.gen.ts apps/start-admin/src/app/_dashboard.index.tsx apps/start-admin/src/components/layouts/ 2>/dev/null || true
git commit -m "refactor(routing): configure TanStack Router setup and root dashboard layout" || true

# Commit 5
git add apps/start-admin/src/app/auth.callback.tsx apps/start-admin/src/app/login.tsx apps/start-admin/src/server/auth.ts apps/start-admin/src/server/auth-guard.ts apps/start-admin/src/server/security-headers.ts 2>/dev/null || true
git commit -m "feat(auth): implement authentication flow and security headers" || true

# Commit 6
git add apps/start-admin/src/components/ui/Button.tsx apps/start-admin/src/components/ui/SectionHeader.tsx apps/start-admin/src/components/ui/HeaderNav.tsx apps/start-admin/src/components/ui/MultiColumnLayout.tsx 2>/dev/null || true
git commit -m "feat(ui): implement core shared ui components (Button, Headers, Nav)" || true

# Commit 7
git add apps/start-admin/src/components/ui/ 2>/dev/null || true
git commit -m "feat(ui): implement complex shared overlays and modular widgets" || true

# Commit 8
git add apps/start-admin/src/features/ai-agent/ 2>/dev/null || true
git commit -m "feat(ai-agent): implement unified AI article formulation and details interface" || true

# Commit 9
git add apps/start-admin/src/app/_dashboard.ai-agent.tsx apps/start-admin/src/server/pipelines.ts apps/start-admin/src/server/upload.ts 2>/dev/null || true
git commit -m "feat(ai-agent): establish AI pipeline routes and upload server actions" || true

# Commit 10
git add apps/start-admin/src/features/articles/ 2>/dev/null || true
git commit -m "feat(articles): refactor article management pipelines and list views" || true

# Commit 11
git add apps/start-admin/src/app/_dashboard.articles.tsx apps/start-admin/src/server/articles.ts apps/start-admin/src/hooks/use-admin-articles.ts 2>/dev/null || true
git add apps/start-admin/src/app/_dashboard.editor*.tsx 2>/dev/null || true
git commit -m "feat(routing): update article dashboard routes and API hooks" || true

# Commit 12
git add apps/start-admin/src/features/applications/ 2>/dev/null || true
git commit -m "feat(applications): build applications detail views and interview prep" || true

# Commit 13
git add apps/start-admin/src/app/_dashboard.applications*.tsx apps/start-admin/src/server/applications.ts apps/start-admin/src/hooks/use-admin-applications.ts 2>/dev/null || true
git commit -m "feat(applications): implement applications list routing and backend server endpoints" || true

# Commit 14
git add apps/start-admin/src/app/_dashboard.resumes*.tsx apps/start-admin/src/server/resumes.ts 2>/dev/null || true
git commit -m "feat(resumes): configure resume editing routes and server integration" || true

# Commit 15
git add -A 2>/dev/null || true
git commit -m "feat(ops): establish calendar routes, finops reporting, and shared integrations" || true
