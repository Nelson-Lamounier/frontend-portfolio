import { createFileRoute } from '@tanstack/react-router'
import { DashboardOverview } from '../features/overview/components/DashboardOverview'

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardOverview,
})


/**
 * Route Example	Next.js	TanStack Start
Root Layout	src/app/layout.tsx	src/app/__root.tsx
/ (Home Page)	src/app/page.tsx	src/app/index.tsx
/posts (Static Route)	src/app/posts/page.tsx	src/app/posts.tsx
/posts/[slug] (Dynamic)	src/app/posts/[slug]/page.tsx	src/app/posts/$slug.tsx
/posts/[...slug] (Catch-All)	src/app/posts/[...slug]/page.tsx	src/app/posts/$.tsx
/api/endpoint (API Route)	src/app/api/endpoint/route.ts	src/app/api/endpoint.ts
 */