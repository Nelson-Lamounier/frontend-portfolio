# ADR-001: Adopt Zustand + TanStack Query for Admin State Management

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-03-28 |
| **Decision Makers** | Nelson Lamounier |
| **Scope** | `src/app/admin/**`, `src/lib/api/`, `src/lib/hooks/`, `src/lib/stores/` |
| **Supersedes** | Inline `useEffect` + `useState` data-fetching pattern |

---

## 1. Context

The admin dashboard is a protected Next.js 15 App Router application that manages
articles (CRUD, MDX editing, publish pipeline), comments (moderation), resumes
(version management), and an AI-powered content generation workflow powered by AWS
Bedrock. All admin API routes communicate with DynamoDB and S3 via Next.js Route
Handlers under `/api/admin/**`.

### Pain Points (Before)

1. **No client-side caching** — Every page navigation or tab switch re-fetched data
   from DynamoDB, increasing latency and DynamoDB read costs.
2. **Manual loading/error states** — Each component maintained its own `useState`
   triple (`loading: boolean`, `error: string | null`, `data: T | null`), leading
   to 30+ lines of boilerplate per data-fetching component.
3. **No cache invalidation** — After a mutation (e.g., publishing an article), the
   sidebar badge counts and listings were stale until the user manually refreshed.
4. **Prop drilling for notifications** — Toast-like feedback was passed through 3–4
   component layers or handled via `window.alert()`.
5. **No request deduplication** — Multiple components rendering the same data (e.g.,
   draft count in sidebar + the drafts page) would fire independent fetch calls.

---

## 2. Decision

Adopt **TanStack Query v5** for server-state management and **Zustand v5** for
client-state, replacing all inline `useEffect` + `useState` patterns in the admin
dashboard.

### Why TanStack Query (Server State)

| Capability | How it solves the pain |
|-----------|----------------------|
| **Automatic caching** | Query results are cached by hierarchical keys and served instantly on re-render |
| **Stale-while-revalidate** | Data stays visible while a background refetch runs (60s stale time) |
| **Cache invalidation** | `queryClient.invalidateQueries({ queryKey })` wipes the exact cache segment after mutations |
| **Request deduplication** | Multiple `useQuery` calls with the same key collapse into a single network request |
| **Optimistic loading states** | `isPending`, `isError`, `isSuccess`, `data` are derived automatically |
| **Devtools** | In-development query inspector shows cache state, timing, and refetch triggers |

### Why Zustand (Client State)

| Capability | How it solves the pain |
|-----------|----------------------|
| **Zero boilerplate** | A single `create()` call replaces `createContext` + `Provider` + `useContext` |
| **No provider nesting** | Stores can be consumed from any component without wrapping in a Provider |
| **Tiny bundle** | ~1 KB gzipped — negligible production impact |
| **SSR safe** | Works without hydration mismatch issues in Next.js 15 |

### Why NOT React Context for Server State

React Context triggers a re-render of **all consumers** when any value changes.
For a frequently mutating cache (new articles, comment updates), this would cause
cascading re-renders across the entire admin tree.

### Why NOT Redux / Recoil / Jotai

| Option | Why rejected |
|--------|-------------|
| Redux Toolkit + RTK Query | Over-engineered for a solo-developer admin panel; massive API surface |
| Recoil | Experimental, Facebook-internal focus, no clear maintenance path |
| Jotai | Excellent for fine-grained atom state but lacks built-in server-state primitives (caching, invalidation, deduplication) |
| SWR | Viable alternative but TanStack Query has richer mutation support, devtools, and hierarchical key invalidation |

---

## 3. Architecture Overview

### Layer Separation

```
┌──────────────────────────────────────────────────────────────┐
│                    Admin Page Components                      │
│  (use client — consume hooks, fire mutations, read toasts)   │
├──────────────────────────────────────────────────────────────┤
│                       Hooks Layer                             │
│  use-admin-articles.ts │ use-admin-comments.ts │ etc.        │
│  (useQuery / useMutation wrappers with cache invalidation)   │
├──────────────────────────────────────────────────────────────┤
│                       API Layer                               │
│  admin-api.ts (typed fetch wrappers — pure async functions)  │
│  query-keys.ts (hierarchical cache key factory)              │
├──────────────────────────────────────────────────────────────┤
│                       Store Layer                             │
│  toast-store.ts (Zustand — client-only global state)         │
├──────────────────────────────────────────────────────────────┤
│                   QueryClient Factory                         │
│  query-client.ts (SSR-safe singleton with admin defaults)    │
├──────────────────────────────────────────────────────────────┤
│               Provider / Layout Integration                   │
│  QueryProvider.tsx — wraps admin layout with context          │
│  ToastContainer.tsx — renders Zustand toast notifications     │
│  layout.tsx — composes: QueryProvider > AdminDashboard > Toast│
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **API functions are plain `async` — not hooks**. This keeps them testable and
   reusable as both `queryFn` parameters and direct imperative calls.

2. **Query keys use a factory pattern**. The `adminKeys` object provides
   hierarchical keys (`adminKeys.articles.all`, `adminKeys.articles.list(status)`,
   `adminKeys.articles.content(slug)`) enabling precise cache invalidation.

3. **QueryClient is a browser singleton, server-fresh**. In the browser, one
   `QueryClient` instance is reused across navigations. On the server (SSR), a
   fresh instance is created per request to prevent cross-request data leakage.

4. **Zustand is reserved for UI-only state**. The toast store manages ephemeral
   notification state. Server data (articles, comments, resumes) is never placed
   in Zustand — it lives exclusively in the TanStack Query cache.

5. **QueryProvider is scoped to `/admin/(authenticated)`**. Public-facing pages
   (articles, blog, resume viewer) remain pure Server Components with zero
   client-side JavaScript for data fetching. Only the admin dashboard pays the
   TanStack Query bundle cost (~13 KB gzipped).

---

## 4. Consequences

### Positive

- **~60% less component code** — Removed 30+ `useState` triples and `useEffect`
  blocks across admin pages.
- **Instant navigation** — Cached data renders immediately on admin tab switches.
- **Automatic freshness** — `refetchOnWindowFocus: true` ensures data is current
  when the user returns from another browser tab.
- **Surgical invalidation** — Publishing an article invalidates `adminKeys.articles.all`,
  which refreshes both the listing page and sidebar counts, but leaves comments and
  resumes untouched.
- **Developer experience** — ReactQueryDevtools provides real-time cache inspection
  during development.

### Negative / Trade-offs

- **Two new dependencies** — `zustand` (~1 KB) and `@tanstack/react-query` (~13 KB)
  added to the admin bundle. Acceptable given the admin dashboard is not
  performance-critical for end users.
- **Learning curve** — Contributors must understand query keys, cache invalidation,
  and mutation lifecycle. Mitigated by comprehensive TSDoc on every hook.
- **DevTools in development only** — `ReactQueryDevtools` is tree-shaken in
  production but adds ~30 KB to the development bundle.

### Neutral

- **Public pages unaffected** — The SSR/ISR rendering strategy for `/articles/**`
  remain unchanged. There is zero runtime cost for public visitors.
- **API routes unchanged** — All `/api/admin/**` Route Handlers continue to work
  identically. The migration was client-side only.

---

## 5. References

| Resource | URL |
|----------|-----|
| TanStack Query v5 Docs | https://tanstack.com/query/latest/docs/framework/react/overview |
| TanStack Query SSR Guide | https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr |
| Zustand v5 Docs | https://docs.pmnd.rs/zustand/getting-started/introduction |
| Query Key Factory Pattern | https://tkdodo.eu/blog/effective-react-query-keys |
| Next.js 15 App Router | https://nextjs.org/docs/app |
