/** @format */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
// eslint-config-next 16 ships a native flat config (react, react-hooks,
// @next/next, core-web-vitals) — no more FlatCompat / legacy `extends`.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      '.turbo/**',
      'coverage/**',
      'next-env.d.ts', // Ignore Next.js type definitions
      'scripts/**', // Migration and deployment scripts
    ],
  },

  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js flat config (react-hooks & @next/next rules)
  ...nextCoreWebVitals,

  // Next 16 ships react-hooks v6, whose new experimental rules flag several
  // established, intentional patterns here: `usePrevious` reading a ref during
  // render, and setState from mount guards / timer callbacks inside effects.
  // Runtime behaviour is correct and unchanged by the Next 16 migration; these
  // two rules are deferred pending a dedicated hooks review.
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },

  // JavaScript config files (including CommonJS)
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // TypeScript and React files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-require-imports': 'off', // Allow require in tests
      '@typescript-eslint/triple-slash-reference': 'off', // Allow Next.js triple slash references

      // React specific rules
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/prop-types': 'off', // Using TypeScript for prop validation

      // General rules
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Test files configuration
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '__tests__/**/*',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      // Test mocks legitimately use <img> elements (mocking next/image)
      '@next/next/no-img-element': 'off',
      'jsx-a11y/alt-text': 'off',
    },
  },

  // API routes and server-side code
  {
    files: ['src/app/api/**/*.ts', 'src/lib/**/*.ts'],
    rules: {
      'no-console': 'off', // Allow console in API routes and server utilities
    },
  },
)
