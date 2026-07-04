import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Only measure application source (exclude type-only files, barrels, and
  // generated/instrumentation code that skews the ratio).
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/instrumentation.ts',
    '!src/**/*.types.ts',
  ],
  // Ratchet floor set just below the honest all-source coverage (measured across
  // ALL src via collectCoverageFrom, incl. untested files: statements/lines ~46%,
  // branches ~68%, functions ~40%). Gates against regression; raise as coverage
  // grows. Coverage was collected but ungated before — see the DORA report
  // (docs/reports/github-dora-review.md).
  coverageThreshold: {
    global: {
      statements: 42,
      branches: 60,
      functions: 35,
      lines: 42,
    },
  },
}

// The MDX renderer pulls the unified/rehype/remark ecosystem, which ships pure
// ESM. next/jest hard-sets transformIgnorePatterns to ignore ~all of node_modules,
// and Jest ignores a file if it matches ANY pattern — so appending can't un-ignore
// them. We therefore override the RESOLVED config to allow-list that ESM family for
// transformation. This makes the suite deterministic regardless of how those
// packages are hoisted (a narrow pattern breaks whenever a lockfile change
// re-hoists e.g. rehype-slug to the top level).
const ESM_ALLOWLIST = [
  'next-mdx-remote',
  '@mdx-js',
  'unified',
  'bail',
  'trough',
  'is-plain-obj',
  'zwitch',
  'ccount',
  'longest-streak',
  'escape-string-regexp',
  'markdown-table',
  'devlop',
  'github-slugger',
  'refractor',
  'parse-entities',
  'property-information',
  'space-separated-tokens',
  'comma-separated-tokens',
  'web-namespaces',
  'html-void-elements',
  'html-url-attributes',
  'decode-named-character-reference',
  'character-entities.*',
  'stringify-entities',
  'trim-lines',
  'unist-util-.*',
  'vfile',
  'vfile-.*',
  'remark-.*',
  'rehype-.*',
  'mdast-.*',
  'micromark',
  'micromark-.*',
  'hast-util-.*',
  'hastscript',
  'estree-util-.*',
].join('|')

// next/jest exports config as an async factory so it can load next.config; we wrap
// it to post-process the resolved transformIgnorePatterns.
const buildConfig = async (): Promise<Config> => {
  const jestConfig = await createJestConfig(config)()
  jestConfig.transformIgnorePatterns = [
    `node_modules/(?!(${ESM_ALLOWLIST})/)`,
    // Preserve next/jest's CSS-modules handling.
    '^.+\\.module\\.(css|sass|scss)$',
  ]
  return jestConfig
}

export default buildConfig
