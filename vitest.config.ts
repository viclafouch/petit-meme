import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    // Scoped to `src` so build outputs (`.output`, `.vercel`) are never scanned.
    include: ['src/**/*.test.ts']
  }
})
