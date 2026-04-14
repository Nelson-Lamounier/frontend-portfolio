import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// isSsrBuild is true when Vinxi builds the SSR (server) bundle.
// Tailwind must NOT run in the SSR pass: if it does, it re-processes
// styles.css and assigns a NEW content hash that is different from the
// client build's hash. The server bundle then embeds this SSR hash as
// the stylesheet URL, but only the CLIENT hash exists on disk — causing
// the "Refused to apply style … text/html" MIME error on every page load.
// With Tailwind disabled in SSR, Vite reads the stylesheet URL from the
// client manifest (correct hash) instead of recomputing it.
const config = defineConfig(({ isSsrBuild }) => ({
  base: '/admin/',
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
  server: {
    proxy: {
      '/admin/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    !isSsrBuild && tailwindcss(),
    tanstackStart({ router: { routesDirectory: 'app' } }),
    viteReact(),
  ].filter(Boolean),
}))

export default config
