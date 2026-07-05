---
title: Article SEO structured data — JSON-LD, Metadata API, OpenGraph from one Zod source
type: concept
tags: [seo, nextjs, json-ld, opengraph, zod]
sources:
  - apps/site/src/lib/articles/article-structured-data.ts
  - apps/site/src/lib/types/content-schemas.ts
created: 2026-07-05
updated: 2026-07-05
---

## Overview

Every dynamic article page emits three SEO surfaces — a schema.org
JSON-LD block, the Next.js Metadata API object (title/description/
keywords), and OpenGraph/Twitter cards — all generated from a single
Zod-validated metadata object. Validation happens once
(`safeValidateMetadata` in
[content-schemas.ts](../../apps/site/src/lib/types/content-schemas.ts)),
and a page that fails validation renders `notFound()` rather than shipping
malformed structured data to crawlers.

## How it works

[article-structured-data.ts](../../apps/site/src/lib/articles/article-structured-data.ts)
exposes two pure generators over the validated shape:

- `generateArticleJsonLd()` builds a schema.org **TechArticle** —
  headline, description, author/publisher as `Person`, `datePublished`,
  canonical `url` and `mainEntityOfPage`, plus conditional fields that
  appear only when the data exists: `image` (hero), `keywords` (tags),
  `abstract` (AI summary), and `timeRequired` as an ISO-8601 duration
  (`PT<n>M`) from the reading-time estimate.
- `generateArticleMetadata()` builds the Next.js `Metadata` object with
  the same title/description/keywords, an `article`-typed OpenGraph block
  (publishedTime, authors, tags, hero image), and Twitter card fields.

The page injects the JSON-LD via a `<script type="application/ld+json">`
tag and returns the metadata object from `generateMetadata()` — see
[articles/[slug]/page.tsx](<../../apps/site/src/app/(site)/articles/[slug]/page.tsx>).

## Tradeoffs

Deriving all three surfaces from one validated object trades flexibility
(a surface cannot deviate from the shared shape) for consistency: title,
description, dates, and tags can never disagree between the JSON-LD, the
`<head>` metadata, and the OG cards, and conditional spread keeps optional
fields absent rather than empty — crawlers see no `"image": null` noise.
The fail-closed validation choice means a malformed upstream row costs a
404 rather than degraded SEO, which fits a portfolio where structured-data
quality is part of the product.

## Related concepts

- [API & data communication](./api-and-data-communication.md) — where the
  metadata originates (public-api BFF)
- [In-cluster BFF consumer architecture](./in-cluster-bff-consumer.md)

<!--
Evidence trail (auto-generated):
- Source: apps/site/src/lib/articles/article-structured-data.ts (read on 2026-07-05)
- Source: apps/site/src/app/(site)/articles/[slug]/page.tsx (read on 2026-07-05)
-->
