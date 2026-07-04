---
title: MDX test suites fail with "Unexpected token 'export'" (next/jest + ESM)
type: troubleshooting
tags: [testing, jest, next-jest, esm, mdx, rehype, transformignorepatterns, flaky-tests]
sources:
  - apps/site/jest.config.ts
  - apps/site/src/components/articles/MDXRenderer.tsx
created: 2026-07-04
updated: 2026-07-04
---

## Symptom

The MDX-rendering test suites — `__tests__/integration/articles-flow.test.tsx`
and `__tests__/app/articles/[slug]/page.test.tsx` — fail to run with:

```
SyntaxError: Unexpected token 'export'
  .../node_modules/rehype-slug/index.js:5
  export {default} from './lib/index.js'
```

The tell-tale sign is that it is **flaky**: CI is green and a colleague's machine
passes, but a fresh `yarn install` fails the same two suites. Nothing in the code
or the test changed.

## Root cause

`MDXRenderer` imports the **unified / rehype / remark** ecosystem (`rehype-slug`,
`rehype-prism-plus`, and their transitive deps), which ships **pure ESM**. Jest
does not transform `node_modules` unless a package is allow-listed in
`transformIgnorePatterns`, so the raw `export` fails.

Two things combine to make it flaky:

1. **`next/jest` hard-sets `transformIgnorePatterns`.** It prepends patterns that
   ignore essentially all of `node_modules` (e.g. `/node_modules/(?!(geist)/)`).
   Jest ignores a file if it matches **any** pattern in the array, so simply
   *appending* an allow-list entry (`node_modules/(?!(next-mdx-remote)/)`) can
   never *un-ignore* a package that next/jest's pattern already matched.
2. **Hoisting decides the outcome.** Whether `rehype-slug` happens to resolve to a
   path Jest transforms depends on how Yarn hoists it, which changes with any
   lockfile edit. So the suite passes or fails **by luck of the install**, not by
   correctness — CI has simply been getting a favourable hoist.

`transpilePackages` in `next.config` does **not** fix it either — next/jest's SWC
transformer still skips those `node_modules` paths.

## The fix

Override the **resolved** Jest config (not just append) so the ESM family is
allow-listed for transformation, in
[jest.config.ts](../../apps/site/jest.config.ts):

```ts
const buildConfig = async (): Promise<Config> => {
  const jestConfig = await createJestConfig(config)()
  jestConfig.transformIgnorePatterns = [
    `node_modules/(?!(${ESM_ALLOWLIST})/)`,        // rehype-*/remark-*/unified/…
    '^.+\\.module\\.(css|sass|scss)$',              // preserve next/jest CSS-modules
  ]
  return jestConfig
}
export default buildConfig
```

`ESM_ALLOWLIST` names the unified/rehype/remark/hast/mdast/micromark family. Because
this **replaces** next/jest's `node_modules`-ignoring patterns instead of adding to
them, the packages are transformed wherever they hoist. Deterministic result:
**19 suites / 307 tests pass** on a fresh install.

## Verify

```bash
rm -rf node_modules && yarn install     # force a fresh hoist
yarn test --ci --runInBand              # 19 suites / 307 tests, green
```

## How to prevent

- **Don't rely on a narrow `transformIgnorePatterns`** for ESM `node_modules`
  under next/jest — override the resolved config so it is hoisting-independent.
- When adding an MDX/remark/rehype plugin that pulls new ESM packages, add its
  package name (or a `prefix-.*` pattern) to `ESM_ALLOWLIST`.
- Treat a suite that "passes on CI but fails locally" as a hoisting/transform
  determinism bug, not a local-environment quirk.

## Related

- [Frontend development](../concepts/frontend-development.md) — the test stack (Jest + RTL)
- [Troubleshooting guide](./README.md)

<!--
Evidence trail (2026-07-04):
- next/jest resolved transformIgnorePatterns prepends /node_modules/(?!(geist)/); appended allow-list ineffective
- Pristine origin/main fails the 2 MDX suites on fresh install (rehype-slug ESM); CI green by favourable hoist
- Fix: async override of resolved config replacing transformIgnorePatterns → 19 suites / 307 tests deterministic
-->
