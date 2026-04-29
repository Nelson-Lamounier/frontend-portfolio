import { defineConfig, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import { copyFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// After the client build, copy the hashed stylesheet to a fixed name so the
// SSR bundle and browser always agree on the URL (/admin/assets/styles.css).
//
// Why fixed name: Vinxi's client and server builds are separate Vite processes.
// Each process independently transforms styles.css → different content hash.
// Client (with Tailwind) → hash A. Server (no Tailwind) → hash B.
// The server embeds hash B as the stylesheet URL, but only hash A exists on
// disk → "Refused to apply style … text/html" MIME error on every load.
//
// The __root.tsx hardcodes /admin/assets/styles.css (no hash). This plugin
// ensures that file actually exists after the client build by copying the
// hashed file to the fixed name. Cache busting is handled at deploy time —
// a new container image always replaces the old one.
function copyStylesFixedName(isSsrBuild: boolean): Plugin {
  return {
    name: 'copy-styles-fixed-name',
    apply: 'build',
    closeBundle() {
      if (isSsrBuild) return // CSS is only emitted by the client build
      const assetsDir = join(process.cwd(), 'dist', 'client', 'assets')
      try {
        const hashed = readdirSync(assetsDir).find((f) => /^[\w-]+-[\w-]+\.css$/.test(f))
        if (hashed) {
          copyFileSync(join(assetsDir, hashed), join(assetsDir, 'styles.css'))
          // console.log(`\n  ✓ Copied ${hashed} → assets/styles.css (fixed name for SSR)`)
        }
      } catch {
        // dist/client/assets may not exist yet during early build phases
      }
    },
  }
}

const config = defineConfig(({ isSsrBuild }) => ({
  base: '/admin/',
  resolve: {
    alias: {
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
    copyStylesFixedName(isSsrBuild ?? false),
  ].filter(Boolean),
}))

export default config
