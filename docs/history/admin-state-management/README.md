# Admin State Management — Engineering Documentation

> [!NOTE]
> **Archived — describes a separate app, not this repo.** This documents the
> Zustand and TanStack Query architecture of the **admin dashboard**, which lives
> in a separate application (the `/admin/*` routes are proxied to it — see
> `next.config.mjs`). The frontend-portfolio repo has **no admin route**; the
> unused `QueryProvider` / `query-client` scaffolding and the `@tanstack/react-query`
> and `zustand` dependencies were removed from this repo on 2026-07-04. Kept for
> provenance; maintain it from the admin app's own repository.

Comprehensive technical reference for the Zustand and TanStack Query state
management architecture adopted in the portfolio admin dashboard.

## Table of Contents

| Document | Purpose |
|----------|---------|
| [Architecture Decision Record](./adr-zustand-tanstack-query.md) | _Why_ we chose Zustand + TanStack Query |
| [Architecture Design](./architecture-design.md) | _How_ the system is structured, with diagrams and data-flow |
| [Runbook](./runbook.md) | Operational procedures for debugging, extending and maintaining |

---

## Quick Context

The admin dashboard at `/admin/**` manages articles, comments, resumes, and AI-powered
content generation. Prior to this migration, all data fetching was hand-rolled `fetch()`
calls inside `useEffect` hooks with manual `useState` triples (`loading`, `error`, `data`).

**Migration date**: March 2026

### Package Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `zustand` | `^5.0.12` | Lightweight client-side global state (toasts, UI flags) |
| `@tanstack/react-query` | `^5.95.2` | Server-state caching, deduplication, and mutation management |
| `@tanstack/react-query-devtools` | `^5.95.2` | Dev-only query inspector (tree-shaken in production) |

### File Map

```
src/lib/
├── api/
│   ├── admin-api.ts          # Typed fetch wrappers (queryFn / mutationFn)
│   └── query-keys.ts         # Hierarchical cache key factory
├── hooks/
│   ├── use-admin-articles.ts  # Article queries + mutations
│   ├── use-admin-comments.ts  # Comment queries + mutations
│   ├── use-admin-resumes.ts   # Resume queries + mutations
│   └── use-publish-draft.ts   # AI Agent publish mutation
├── stores/
│   └── toast-store.ts         # Zustand toast notification store
└── query-client.ts            # SSR-safe singleton QueryClient factory

src/components/
├── providers/
│   └── QueryProvider.tsx      # Client-side QueryClientProvider wrapper
└── admin/
    └── ToastContainer.tsx     # Renders toasts from the Zustand store

src/app/admin/
├── (authenticated)/
│   ├── layout.tsx             # Wraps pages with QueryProvider + ToastContainer
│   ├── page.tsx               # Dashboard overview
│   ├── ai-agent/page.tsx      # Upload/Paste content generation
│   ├── drafts/page.tsx        # Draft articles listing
│   ├── editor/[slug]/page.tsx # MDX editor
│   ├── comments/page.tsx      # Comment moderation queue
│   └── resumes/page.tsx       # Resume version manager
└── login/page.tsx             # Login (outside QueryProvider scope)
```
