/// <reference types="vitest/config" />
import { cpSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages has no SPA rewrite, so give each route a real index.html (served with a 200).
const ROUTE_DIRS = ['gallery', 'about']
const routeEntries = (): Plugin => {
  let outDir = 'dist'
  return {
    name: 'route-entries',
    apply: 'build',
    configResolved: (c) => {
      outDir = c.build.outDir
    },
    closeBundle() {
      for (const dir of ROUTE_DIRS) {
        mkdirSync(join(outDir, dir), { recursive: true })
        cpSync(join(outDir, 'index.html'), join(outDir, dir, 'index.html'))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), routeEntries()],
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
