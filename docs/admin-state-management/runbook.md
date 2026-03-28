# Operational Runbook — Admin State Management

> Solo-operator procedures for debugging, maintaining, and extending
> the Zustand + TanStack Query architecture.

---

## Table of Contents

1. [Common Issues & Troubleshooting](#1-common-issues--troubleshooting)
2. [Cache Debugging with DevTools](#2-cache-debugging-with-devtools)
3. [Adding a New Query](#3-adding-a-new-query)
4. [Adding a New Mutation](#4-adding-a-new-mutation)
5. [Adding a New Zustand Store](#5-adding-a-new-zustand-store)
6. [Upgrading Dependencies](#6-upgrading-dependencies)
7. [Testing Procedures](#7-testing-procedures)
8. [Production Monitoring](#8-production-monitoring)
9. [Rollback Procedure](#9-rollback-procedure)

---

## 1. Common Issues & Troubleshooting

### 1.1 Stale Data After Mutation

**Symptom:** After publishing/deleting an article, the listing page still shows
the old state until a manual refresh.

**Root Cause:** The mutation's `onSuccess` handler is not invalidating the correct
cache key.

**Diagnosis:**
1. Open the admin dashboard in development mode.
2. Open ReactQueryDevtools (floating button, bottom-right corner).
3. Perform the mutation.
4. Check if the relevant query key was marked as "stale" in the DevTools panel.

**Fix:**
```typescript
// Ensure the mutation invalidates the parent key, not a specific child
onSuccess: () => {
  void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
  //                                                            ^^^
  // .all invalidates list + content queries. Using .list('all') would 
  // miss content queries.
}
```

---

### 1.2 401 Redirect Loop

**Symptom:** After session expiry, the admin dashboard enters a redirect loop
or shows a blank page.

**Root Cause:** `adminFetch()` throws `UnauthorisedError` on 401, but the
consuming component doesn't redirect to `/admin/login`.

**Diagnosis:**
1. Check the browser console for `[Admin Mutation Error] Session expired`.
2. Verify the `auth()` call in `layout.tsx` is still validating the session.

**Fix:**
```typescript
// In the page/component consuming the hook:
const { error } = useAdminArticles()

useEffect(() => {
  if (error instanceof UnauthorisedError) {
    window.location.href = '/admin/login'
  }
}, [error])
```

> **Note:** Consider adding a global error handler to the QueryClient for
> centralised 401 handling:
> ```typescript
> defaultOptions: {
>   queries: {
>     onError: (error) => {
>       if (error instanceof UnauthorisedError) {
>         window.location.href = '/admin/login'
>       }
>     }
>   }
> }
> ```

---

### 1.3 Hydration Mismatch Errors

**Symptom:** Next.js throws "Hydration failed because the server-rendered HTML
didn't match the client" in the admin section.

**Root Cause:** The `QueryProvider` component or a hook is being used in a Server
Component (missing `'use client'` directive).

**Diagnosis:**
1. Check the error stack trace for the offending component.
2. Ensure the component file has `'use client'` at the top.
3. Verify that `QueryProvider.tsx` is a client component (it should be).

**Fix:**
- Add `'use client'` to the top of any component that uses TanStack Query hooks.
- Never import `useQuery`, `useMutation`, or `useToastStore` in a Server Component.

---

### 1.4 Toast Not Appearing

**Symptom:** A mutation succeeds but no toast notification appears.

**Root Cause:** Either `addToast()` is not being called, or `ToastContainer` is
not rendered in the component tree.

**Diagnosis:**
1. Check the browser console for the mutation success log.
2. Verify `ToastContainer` is present in the admin layout:
   ```tsx
   // src/app/admin/(authenticated)/layout.tsx
   <QueryProvider>
     <AdminDashboard user={session?.user}>
       {children}
     </AdminDashboard>
     <ToastContainer />   // ← Must be here
   </QueryProvider>
   ```
3. Check the Zustand store state in React DevTools (Components tab → search
   for `ToastContainer` → inspect hooks).

---

### 1.5 Infinite Refetch Loop

**Symptom:** Network tab shows the same API call firing repeatedly (every few
hundred milliseconds).

**Root Cause:** An unstable `queryFn` reference (inline arrow function that
creates a new identity on each render) combined with `refetchOnMount`.

**Diagnosis:**
1. Check if the `queryFn` is defined inline with variable captures:
   ```typescript
   // BAD — creates a new function identity on each render
   useQuery({
     queryKey: adminKeys.articles.content(slug),
     queryFn: () => fetchArticleContent(slug),  // ← captures slug
   })
   ```
2. This specific case is fine because TanStack Query v5 uses `queryKey` for
   identity, not `queryFn`. But if you see infinite loops, check for:
   - Missing `enabled` flag on a query that should be conditional
   - A query key that changes on every render (e.g., `[Date.now()]`)

---

## 2. Cache Debugging with DevTools

### Opening DevTools

In development (`yarn dev`), a floating react-query icon appears in the
bottom-right corner of the admin pages. Click it to open the DevTools panel.

### Panel Features

| Feature | How to use |
|---------|-----------|
| **Query list** | Shows all active/inactive queries with their cache state |
| **Query detail** | Click a query to see its data, timing, and refetch count |
| **Invalidate** | Right-click a query → "Invalidate" to force a refetch |
| **Reset** | Right-click → "Reset" to clear the cache for that query |
| **Refetch** | Right-click → "Refetch" to trigger an immediate background fetch |

### Key States

| State | Badge Colour | Meaning |
|-------|-------------|---------|
| `fresh` | 🟢 Green | Data is within `staleTime` (60s) — will not refetch |
| `stale` | 🟡 Yellow | Data is older than `staleTime` — will refetch on next trigger |
| `fetching` | 🔵 Blue | A network request is in progress |
| `inactive` | ⚫ Grey | No component is currently consuming this query |
| `error` | 🔴 Red | The last fetch attempt failed |

---

## 3. Adding a New Query

**Step-by-step procedure for adding a new read operation:**

### Step 1: Add the API function

```typescript
// src/lib/api/admin-api.ts

/** Shape of the analytics response */
export interface AdminAnalyticsResponse {
  readonly totalViews: number
  readonly topArticles: Array<{ slug: string; views: number }>
}

/**
 * Fetches admin dashboard analytics.
 *
 * @returns Analytics data with view counts
 */
export async function fetchAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  return adminFetch<AdminAnalyticsResponse>('/api/admin/analytics')
}
```

### Step 2: Add the query key

```typescript
// src/lib/api/query-keys.ts

export const adminKeys = {
  // ... existing keys ...

  analytics: {
    all: ['admin', 'analytics'] as const,
    summary: () => ['admin', 'analytics', 'summary'] as const,
  },
} as const
```

### Step 3: Create the hook

```typescript
// src/lib/hooks/use-admin-analytics.ts

import { useQuery } from '@tanstack/react-query'
import { adminKeys } from '@/lib/api/query-keys'
import { fetchAdminAnalytics } from '@/lib/api/admin-api'
import type { AdminAnalyticsResponse } from '@/lib/api/admin-api'

/**
 * Fetches admin dashboard analytics data.
 *
 * @returns TanStack Query result with analytics
 */
export function useAdminAnalytics() {
  return useQuery<AdminAnalyticsResponse>({
    queryKey: adminKeys.analytics.summary(),
    queryFn: fetchAdminAnalytics,
  })
}
```

### Step 4: Consume in a component

```typescript
// src/app/admin/(authenticated)/analytics/page.tsx
'use client'

import { useAdminAnalytics } from '@/lib/hooks/use-admin-analytics'

export default function AnalyticsPage() {
  const { data, isPending, isError } = useAdminAnalytics()

  if (isPending) return <div>Loading...</div>
  if (isError) return <div>Error loading analytics</div>

  return <div>Total views: {data.totalViews}</div>
}
```

---

## 4. Adding a New Mutation

**Step-by-step procedure for adding a new write operation:**

### Step 1: Add the API function

```typescript
// src/lib/api/admin-api.ts

/**
 * Archives an article (soft-delete).
 *
 * @param slug - Article slug to archive
 */
export async function archiveArticle(slug: string): Promise<void> {
  await adminFetch('/api/admin/articles/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })
}
```

### Step 2: Create the mutation hook

```typescript
// Add to src/lib/hooks/use-admin-articles.ts

/**
 * Mutation hook for archiving an article.
 * Invalidates the articles cache on success.
 *
 * @returns TanStack Mutation with `mutate(slug)`
 */
export function useArchiveArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => archiveArticle(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
    },
  })
}
```

### Step 3: Wire into a component with toast feedback

```typescript
const archiveMutation = useArchiveArticle()
const { addToast } = useToastStore()

function handleArchive(slug: string) {
  archiveMutation.mutate(slug, {
    onSuccess: () => addToast('success', `"${slug}" archived.`),
    onError: (err) => addToast('error', err.message),
  })
}
```

---

## 5. Adding a New Zustand Store

**Only for client-side ephemeral state.** Server data belongs in TanStack Query.

### When to use Zustand

| Use case | Use Zustand? |
|----------|-------------|
| Toast notifications | ✅ Yes |
| Modal open/close state | ✅ Yes |
| Sidebar collapsed flag | ✅ Yes |
| Theme preference | ✅ Yes |
| Article list data | ❌ No — use TanStack Query |
| User session | ❌ No — use Auth.js `auth()` |
| Form field values | ❌ No — use local `useState` |

### Template

```typescript
// src/lib/stores/my-store.ts

import { create } from 'zustand'

interface MyState {
  isOpen: boolean
}

interface MyActions {
  open: () => void
  close: () => void
  toggle: () => void
}

export const useMyStore = create<MyState & MyActions>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
```

---

## 6. Upgrading Dependencies

### TanStack Query

```bash
# Check for updates
yarn outdated @tanstack/react-query @tanstack/react-query-devtools

# Upgrade (minor/patch)
yarn add @tanstack/react-query@latest @tanstack/react-query-devtools@latest

# After upgrade — verify
yarn build
yarn dev  # Test admin pages manually
```

**Breaking change risk:** TanStack Query v5 was adopted at initial migration.
Monitor the [TanStack changelog](https://github.com/TanStack/query/releases)
for v6 migration guides when released.

### Zustand

```bash
yarn outdated zustand
yarn add zustand@latest

# Zustand is extremely stable — breaking changes are rare.
```

---

## 7. Testing Procedures

### Unit Testing Hooks

Use `@testing-library/react` with a wrapper that provides `QueryClientProvider`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

it('should fetch admin articles', async () => {
  const { result } = renderHook(() => useAdminArticles(), {
    wrapper: createWrapper(),
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.drafts).toBeDefined()
})
```

### Unit Testing Zustand Stores

Zustand stores can be tested directly without React:

```typescript
import { useToastStore } from '@/lib/stores/toast-store'

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

it('should add and auto-remove a toast', () => {
  const { addToast } = useToastStore.getState()
  addToast('success', 'Test toast', 100)

  expect(useToastStore.getState().toasts).toHaveLength(1)

  // Wait for auto-dismiss
  jest.advanceTimersByTime(100)
  expect(useToastStore.getState().toasts).toHaveLength(0)
})
```

### Integration Smoke Test (Manual)

After any deployment affecting the admin dashboard:

1. Navigate to `/admin/login` → sign in
2. Verify the dashboard loads articles/comments/resumes counts
3. Create a draft article → verify it appears in the drafts listing
4. Publish the draft → verify it moves to published
5. Navigate to Comments → moderate a comment
6. Navigate to Resumes → verify resume list loads
7. Open DevTools → verify no queries are in error state

---

## 8. Production Monitoring

### Console Errors

All mutation errors are logged to the console via the global `onError` handler
in `query-client.ts`:

```
[Admin Mutation Error] <error message>
```

**If Grafana Faro is configured**, these errors propagate as browser exceptions
and appear in the Grafana Cloud Logs dashboard.

### Network Monitoring

Monitor for elevated 401 responses on `/api/admin/**` endpoints — this indicates
session expiry or authentication misconfiguration. CheckCloudWatch for corresponding
API route logs.

### Key Metrics to Watch

| Metric | Source | Alarm Threshold |
|--------|--------|----------------|
| Admin API 5xx rate | CloudWatch | > 5 errors in 5 minutes |
| Admin API latency (p95) | CloudWatch | > 3 seconds |
| DynamoDB read capacity | CloudWatch | > 80% provisioned |
| Client-side JS errors | Grafana Faro | Any `UnauthorisedError` spike |

---

## 9. Rollback Procedure

If a critical regression is introduced by changes to the state management layer:

### Quick Fix: Disable Cache

```typescript
// src/lib/query-client.ts — emergency override
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,              // Never serve stale data
        cacheTime: 0,              // Don't cache at all
        refetchOnWindowFocus: false,
        retry: 0,
      },
    },
  })
}
```

This effectively turns TanStack Query into a pass-through, behaving like the
pre-migration `useEffect` + `fetch` pattern while keeping the hook API stable.

### Full Rollback

1. Revert the `src/lib/api/`, `src/lib/hooks/`, and `src/lib/stores/` directories
   to the commit before ADR-001 implementation.
2. Revert `src/app/admin/(authenticated)/layout.tsx` to remove `QueryProvider`.
3. Remove `@tanstack/react-query`, `@tanstack/react-query-devtools`, and `zustand`
   from `package.json`.
4. Run `yarn install` to clean the lock file.
5. Rebuild and redeploy.

> **Impact:** All admin pages would need to re-implement their own `useEffect` +
> `useState` data-fetching patterns. This is a significant code change and should
> only be considered as an extreme last resort.
