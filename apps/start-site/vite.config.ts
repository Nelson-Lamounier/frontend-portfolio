import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: {
    alias: {
      '@/lib': fileURLToPath(new URL('../../packages/shared/src/lib', import.meta.url)),
      '@/types': fileURLToPath(new URL('../../packages/shared/src/types', import.meta.url)),
      '@/components/ui': fileURLToPath(new URL('../../packages/shared/src/components/ui', import.meta.url)),

      '@/components/analytics': fileURLToPath(new URL('../../packages/shared/src/components/analytics', import.meta.url)),
      '@/components/providers': fileURLToPath(new URL('../../packages/shared/src/components/providers', import.meta.url)),
      '@/images': fileURLToPath(new URL('../../packages/shared/src/images', import.meta.url)),
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
