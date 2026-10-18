import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    include: ['src/**/*.test.ts', 'lint/**/*.test.ts'],
    pool: 'threads',
    isolate: false,
    maxWorkers: 2
  }
})
