/// <reference types="vitest/config" />
import { cpSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages has no SPA rewrite, so give /gallery a real index.html (served with a 200).
const galleryEntry = (): Plugin => {
  let outDir = 'dist'
  return {
    name: 'gallery-entry',
    apply: 'build',
    configResolved: (c) => {
      outDir = c.build.outDir
    },
    closeBundle() {
      mkdirSync(join(outDir, 'gallery'), { recursive: true })
      cpSync(join(outDir, 'index.html'), join(outDir, 'gallery', 'index.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), galleryEntry()],
  base: '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
