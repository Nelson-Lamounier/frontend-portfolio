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
    '^@/lib/(.*)$': '<rootDir>/../../packages/shared/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/../../packages/shared/src/types/$1',
    '^@/components/ui/(.*)$': '<rootDir>/../../packages/shared/src/components/ui/$1',
    '^@/components/resume/(.*)$': '<rootDir>/../../packages/shared/src/components/resume/$1',
    '^@/components/analytics/(.*)$': '<rootDir>/../../packages/shared/src/components/analytics/$1',
    '^@/components/providers/(.*)$': '<rootDir>/../../packages/shared/src/components/providers/$1',
    '^@/images/(.*)$': '<rootDir>/../../packages/shared/src/images/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!next-mdx-remote)'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
