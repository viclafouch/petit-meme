import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'lint/**/*.test.ts'],
    env: {
      VITE_SITE_URL: 'https://www.petit-meme.io',
      VITE_BUNNY_HOSTNAME: 'vz-test.b-cdn.net'
    },
    pool: 'threads',
    isolate: false,
    maxWorkers: 2
  }
})
