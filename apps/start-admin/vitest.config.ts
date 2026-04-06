/**
 * @format
 * Vitest configuration for start-admin server function tests.
 *
 * Uses the same path aliases as vite.config.ts so that shared package
 * imports resolve correctly in the test environment.
 */

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@/lib': fileURLToPath(new URL('../../packages/shared/src/lib', import.meta.url)),
      '@/types': fileURLToPath(new URL('../../packages/shared/src/types', import.meta.url)),
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    env: {
      STRATEGIST_TABLE_NAME: 'test-strategist-table',
      ARTICLES_TABLE_NAME: 'test-articles-table',
      AWS_REGION: 'eu-west-1',
    },
    coverage: {
      provider: 'v8',
      include: ['src/server/**/*.ts'],
      exclude: ['src/server/security-headers.ts'],
    },
  },
})
