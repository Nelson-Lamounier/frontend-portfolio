---
title: Frontend development — TypeScript, React 19 & Next.js 15
type: concept
tags: [frontend, typescript, react, nextjs, app-router, rsc, seo, testing, tailwind, mdx, accessibility, zod]
sources:
  - apps/site/tsconfig.json
  - apps/site/src/app/**
  - apps/site/src/components/**
  - apps/site/__tests__/**
  - apps/site/next.config.mjs
created: 2026-07-04
updated: 2026-07-04
---

## Overview

The site is a **TypeScript-first Next.js 15 (App Router) application on React 19**.
The house style is: **server-render by default, add client interactivity as small
islands, keep state local, and validate every untyped input at runtime.** This
document explains the language, framework, and library choices — the *why* behind
each — plus the testing story and the frontend tech that wasn't previously
documented.

## The stack at a glance

| Concern | Choice | Version |
| --- | --- | --- |
| Language | **TypeScript** (`strict`) + **Zod** runtime validation | 5.8 / 4.x |
| UI runtime | **React 19** (Server + Client Components) | 19 |
| Framework | **Next.js 15 App Router** (`output: standalone`) | 15.5 |
| Styling | **Tailwind CSS v4** (CSS-first) + typography plugin | 4.1 |
| Interactivity | Framer Motion, Headless UI, next-themes | 12 / 2.2 / 0.4 |
| Content | MDX (`next-mdx-remote`, `remark-gfm`, `rehype-prism-plus`) | — |
| Client telemetry | Grafana Faro RUM | 2.3 |
| Testing | Jest 30 + React Testing Library (jsdom) | 30 / 16 |

## Why TypeScript

TypeScript is used in `strict` mode ([tsconfig.json](../../apps/site/tsconfig.json))
with a `@/*` path alias and the Next TS plugin. It is the correct choice here for
three concrete reasons, not just preference:

1. **Typed contracts across a distributed boundary.** The site consumes a separate
   BFF over JSON. Shared interfaces (`ArticleWithSlug`, `ChatResponse`,
   `PublicComment`) make the wire contract explicit, and discriminated unions model
   outcomes precisely — e.g. `ChatResult = { ok: true; data } | { ok: false; error }`
   ([chat-service.ts:19-24](../../apps/site/src/lib/chat/chat-service.ts#L19-L24))
   force the caller to handle both branches at compile time.
2. **Runtime validation where types can't reach.** Static types vanish at runtime,
   so JSON from the BFF is validated with **Zod** before it is trusted —
   `safeValidateMetadata` gates article SEO metadata before it is rendered
   ([articles/[slug]/page.tsx:97](../../apps/site/src/app/(site)/articles/[slug]/page.tsx#L97)).
   TypeScript + Zod together give *compile-time* and *runtime* safety at the exact
   point untyped data enters the app.
3. **Refactor confidence + tooling.** `strict` (with `noEmit`, `isolatedModules`)
   plus ESLint (`typescript-eslint` + `react-hooks`, `--max-warnings 0`) catches
   whole classes of errors before CI. Type-check is a dedicated CI gate
   (`tsc --noEmit`).

## Why React 19

React's component model maps cleanly to the two things this site needs: mostly
static, server-rendered content, plus a few genuinely interactive pieces. React 19
on the App Router lets those coexist without shipping a heavy SPA.

- **Server Components by default, client islands on demand.** ~76 of ~102 source
  files are Server Components; only **26 declare `'use client'`**. Data-heavy pages
  (home, articles, projects) render on the server; interactivity (chat, like
  button, theme toggle, animations) is isolated to small client components. This
  keeps the JavaScript payload small and the initial HTML complete.

### Hooks actually in use

| Hook | Count | Representative use |
| --- | --- | --- |
| `useState` | 55 | Reducer-shaped widget state as one object ([ChatWidget.tsx:54](../../apps/site/src/components/chat/ChatWidget.tsx#L54)) |
| `useEffect` | 31 | Modal side-effect trio: fetch-once, scroll-lock, Escape-to-close ([ResumeSection.tsx](../../apps/site/src/components/resume/ResumeSection.tsx)) |
| `useCallback` | 31 | Stabilising handlers passed to children (chat components) |
| `useRef` | 24 | DOM/media refs and the "fetch-once" guard (below) |
| `useMemo` | 2 | Memoising the MDX component map ([DynamicArticleContent.tsx:109](../../apps/site/src/components/articles/DynamicArticleContent.tsx#L109)) |
| `useContext` | 2 | `previousPathname` for a "go back" affordance ([ArticleLayout.tsx:53](../../apps/site/src/components/articles/ArticleLayout.tsx#L53)) |
| `useId` | 2 | SSR-safe `aria-labelledby` ([Section.tsx:10](../../apps/site/src/components/layout/Section.tsx#L10)) |
| `useLayoutEffect` | 1 | Position an animated element before paint (avoid flicker) |
| `usePathname` / `useRouter` | 6 / 2 | Active-nav detection, `router.back()` |

Deliberately **not** used: `useReducer`, `useTransition`, `useOptimistic`, `use()`.
Optimistic UI is done by hand (below) rather than via `useOptimistic`.

**Custom hooks** (there is no `lib/hooks/` — only three exist):
`usePrevious<T>` ([providers.tsx:8](../../apps/site/src/app/providers.tsx#L8)),
`useLoadingMessage` (cycles the chat "Lami is searching…" ticker), and
`useErrorTracking` (POSTs to `/api/track-error` — currently unused).

### Notable React patterns

- **Compound + polymorphic components.** `Card` exposes `Card.Link`, `Card.Title`,
  `Card.Description`, `Card.Cta`, `Card.Eyebrow`, several polymorphic via an `as`
  prop with `<T extends React.ElementType>` generics
  ([Card.tsx](../../apps/site/src/components/ui/Card.tsx)).
- **The "fetch-once ref" idiom.** `fetchedRef` / `initialised.current` recurs
  (LikeButton, ResumeSection, CommentSection) to suppress React StrictMode's
  double-effect in dev. **Don't "fix" it** — it's intentional.
- **CSS-variable scroll engine.** `Header`'s scroll/resize `useEffect` writes CSS
  custom properties onto `document.documentElement`; the motion happens in CSS, not
  React state ([Header.tsx](../../apps/site/src/components/layout/Header.tsx)). The
  file header documents this "JS computes numbers, CSS does the motion" strategy.
- **Error boundary.** One class component, `ErrorBoundary`, uses
  `getDerivedStateFromError` / `componentDidCatch`
  ([error-boundary.tsx](../../apps/site/src/components/error-boundary.tsx)).

### State management — kept deliberately small

- **Client state** is local `useState`, plus one app-level React Context
  (`AppContext` carrying `previousPathname`) and `next-themes` for theme.
- **Server state** lives in Server Components and API routes — reads go through the
  BFF with ISR; there is no client data-fetching library in practice (client reads
  use raw `fetch` in `useEffect`).
- **Dormant infrastructure (flag).** `@tanstack/react-query` and `zustand` are
  installed and `lib/query-client.ts` + `components/providers/QueryProvider.tsx`
  exist, but **nothing mounts `QueryProvider` and there are zero `useQuery`/
  `useMutation`/Zustand stores** in this repo. They were scaffolded for an admin
  dashboard that lives in a *separate* app (the `/admin/*` next.config rewrite
  proxies to it). See [Known gaps](#known-gaps--cleanup-candidates).

## UI manipulation & interactivity

- **Framer Motion** — one component, `DevOpsPipelineAnimation`: `motion.div` with
  a shared-layout `layoutId`, a spring transition, and an infinite pulse — every
  animation **gated on `useReducedMotion()`** for accessibility.
- **Headless UI** — the mobile nav `Popover` in `Header` (accessible open/close,
  focus trap, `data-closed`/`data-enter`/`data-leave` transitions).
- **Theme toggling** — `next-themes` (`attribute="class"`, `disableTransitionOnChange`);
  the toggle gates its `aria-label` on a `mounted` flag to avoid a hydration
  mismatch ([Header.tsx](../../apps/site/src/components/layout/Header.tsx)).
- **Optimistic UI (hand-rolled)** — `LikeButton` flips the count immediately and
  **reverts on failure**; `ChatWidget` appends the user message before the network
  resolves.
- **Code-splitting** — the resume PDF path dynamically imports `html2canvas-pro`,
  `jspdf`, and the DOM builder only on download, keeping them out of the main
  bundle ([ResumeSection.tsx](../../apps/site/src/components/resume/ResumeSection.tsx)).
- **Accessibility** — consistent `aria-*` (35× `aria-hidden`, 23× `aria-label`),
  `role="dialog"`/`"alert"`/`"progressbar"`, `aria-live="polite"` for chat status,
  focus management (Escape-to-close, scroll-lock, Headless UI focus trap), semantic
  `<main>`/`<nav>`/`<section>`, and reduced-motion support.

## Why Next.js 15 — and is it better for SEO?

**Yes — meaningfully, and it's implemented, not just claimed.** Next.js is the
right framework here because it renders content on the server, which is exactly
what search engines and AI answer engines need.

### Rendering model

App Router with a two-tier layout: a minimal root HTML shell and a `(site)` route
group for public chrome. Content pages are Server Components with **ISR**
(`export const revalidate = 3600`) and `generateStaticParams` to pre-render
published article slugs; new articles publish instantly via **on-demand
revalidation** (`POST /api/revalidate` → `revalidatePath`). ISR is deliberate: the
Docker build has no cluster access, so pages render against the BFF at runtime and
refresh on a TTL. See [API & data communication](./api-and-data-communication.md).

### SEO features implemented

- **Metadata API** with a title template (`'%s - Nelson Lamounier'`) at the root
  ([layout.tsx](../../apps/site/src/app/layout.tsx)); every page exports `metadata`.
- **Dynamic `generateMetadata`** for articles emitting title, description,
  keywords, full **OpenGraph** (`type: article`, published time, author, tags,
  image), a **Twitter Card**, and a **canonical URL**
  ([article-structured-data.ts:82](../../apps/site/src/lib/articles/article-structured-data.ts#L82)).
- **JSON-LD structured data** — a `schema.org` `TechArticle` block injected
  server-side into each article
  ([articles/[slug]/page.tsx:124](../../apps/site/src/app/(site)/articles/[slug]/page.tsx#L124)).
- **RSS feed** at `/feed.xml` (declared as `rel="alternate"` in root metadata).
- **`next/image`** (with `sharp`) for optimised, layout-stable images; remote
  allow-list in `next.config.mjs`.

### Why server-rendering beats a client-only SPA for SEO

Because articles are RSC + ISR, the `<title>`, meta description, OpenGraph/Twitter
tags, canonical link, and the JSON-LD `TechArticle` are all present **in the
initial server response** — a crawler or social-card scraper sees fully-formed
metadata and content on first fetch, with **no JavaScript execution required**. A
client-only SPA ships an empty shell and injects those tags after hydration, which
many crawlers and scrapers don't wait for. ISR + `generateStaticParams` also serve
pre-rendered, cached HTML (fast Core Web Vitals, friendly to crawl budget) while
staying fresh via `revalidatePath`.

## Styling — Tailwind v4 (CSS-first)

Tailwind v4 with the new CSS-first config: `@import 'tailwindcss'`,
`@plugin '@tailwindcss/typography'`, `@config '../../typography.ts'`, and a
`@custom-variant dark` in `src/styles/tailwind.css`. Prose typography is
customised in `typography.ts`; code blocks are themed via `prism.css`
(rehype-prism-plus). `clsx` composes conditional classes.

## Content pipeline — MDX

Articles render through MDX: `@next/mdx` + `next-mdx-remote` with `remark-gfm` and
`rehype-prism-plus`, and a custom component map in `mdx-components.tsx`
(`Callout`, `Mermaid`, `ProcessTimeline`, `SmartImage` → `next/image`, …). Content
comes from two sources — file-based `.mdx` and RDS-hosted Markdown rendered by
`MDXRenderer` — see [BFF consumer architecture](./in-cluster-bff-consumer.md).

## Client observability — Grafana Faro RUM

`initialiseFaro()` boots once from `providers.tsx` and captures **Web Vitals**
(LCP/INP/CLS/TTFB/FCP), JS errors, and client traces
([faro.ts](../../apps/site/src/lib/observability/faro.ts)); the collector is
reached via a same-origin `/log-proxy` rewrite. This complements the server-side
OpenTelemetry in `instrumentation.ts`. See
[observability architecture](./observability-architecture.md).

## Testing

**Yes — a substantial suite.** Jest 30 via `next/jest` (jsdom) with React Testing
Library.

- **17 test files, ~298 test cases** in the [test suite](../../apps/site/__tests__/).
- **Coverage:** pages (home, about, articles, article detail, projects, uses,
  music), API routes (`chat`, `health`, `metrics`), lib (`article-service`,
  `public-api-articles`, `public-api-engagement`, `rate-limiter`), and three
  **integration flows** (navigation, articles listing→detail, project filtering).
- **Setup** ([jest.setup.ts](../../apps/site/jest.setup.ts)) adds `jest-dom` and
  polyfills `TextEncoder`, `ResizeObserver`, `IntersectionObserver`, `matchMedia`.
- **Coverage is collected (v8) but not enforced** — there is no `coverageThreshold`.
  Adding one would make coverage a real gate. CI runs `yarn test --ci --coverage`.

## Frontend tech inventory (previously undocumented)

TypeScript · Zod runtime validation · React 19 Server/Client Components · Next.js
App Router + ISR + on-demand revalidation · Tailwind v4 CSS-first + typography ·
Framer Motion (+ reduced-motion) · Headless UI · next-themes · MDX
(remark/rehype/Prism) · Grafana Faro RUM · client-side PDF generation
(`html2canvas-pro` + `jspdf`, dynamically imported) · Mermaid diagrams with
pan/zoom · a class `ErrorBoundary` · a broad accessibility layer.

## Known gaps & cleanup candidates

- **Admin state stack — removed.** `@tanstack/react-query`, `zustand`,
  `QueryProvider`, and `query-client.ts` were unused scaffolding for an admin
  dashboard that lives in a separate app; they were removed on 2026-07-04 and the
  docs archived to [history/admin-state-management](../history/admin-state-management/README.md).
- **SEO — remaining.** `sitemap.ts`, `robots.ts`, and `metadataBase` are now in
  place (static routes + article slugs, ISR-refreshed; origin centralised in
  `lib/site-config.ts`). Still missing: **`next/font`** (fonts aren't optimised via
  Next) and Twitter `site`/`creator` handles.
- **No `error.tsx` / `loading.tsx`** route-level boundaries (there is a
  `not-found.tsx`). The class `ErrorBoundary` and Faro cover runtime errors, but App
  Router error/loading UIs are missing.
- **`useErrorTracking` is unused**; `__tests__/README.md` is stale (undercounts and
  cites pre-`(site)` paths).

## Related

- [API & data communication](./api-and-data-communication.md) — how the frontend fetches data
- [The "Lami" chatbot](./chatbot-architecture.md) — the most interactive client feature
- [Observability architecture](./observability-architecture.md) — Faro + OpenTelemetry
- [Request routing — DNS to EKS pod](./request-routing-dns-to-pod.md) — how the rendered HTML is served

<!--
Evidence trail (verified 2026-07-04):
- tsconfig.json strict + @/* alias + next plugin; Zod 4 safeValidateMetadata gates article SEO
- Hooks counts: useState 55, useEffect 31, useCallback 31, useRef 24, useMemo 2, useContext 2, useId 2, useLayoutEffect 1
- 26 'use client' of ~102 files; custom hooks: usePrevious, useLoadingMessage, useErrorTracking (unused)
- TanStack Query + Zustand present but not wired (no useQuery/useMutation, QueryProvider unmounted); admin route absent
- SEO: metadata API + generateMetadata (OG/Twitter/canonical) + JSON-LD TechArticle + feed.xml + next/image; gaps: no sitemap/robots/next/font/metadataBase
- Tests: 17 files, ~298 cases, Jest 30 + RTL + jsdom, v8 coverage, no coverageThreshold
-->
