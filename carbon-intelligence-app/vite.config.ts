/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Deployed as a subpath of the existing static site
// (ecoverseearth.com/carbon-intelligence/), alongside the rest of the
// GitHub Pages-hosted site, so the production base must match that path.
export default defineConfig({
  base: '/carbon-intelligence/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
