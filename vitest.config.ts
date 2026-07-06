/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // vitest 4 default threads pool crashes at describe() with
    // "Cannot read properties of undefined (reading 'config')" across most
    // files. Forks pool avoids the shared-worker state bug.
    pool: 'forks',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'netlify/functions/__tests__/*.{test,spec}.{ts,tsx}',
      'scripts/__tests__/*.{test,spec}.mjs',
    ],
    css: false,
  },
})
