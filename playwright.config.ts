import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL } from './e2e/env'

const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  // The checkout, the longest scenario, takes fifteen to twenty seconds: two
  // page loads, a payment, and the redirect back. Three times that is tolerance
  // for a slow runner, not room for a test to hang.
  timeout: 60_000,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  // `list` first even in CI: `github` only speaks at the end and `html` writes
  // a file, so a run in progress would say nothing about where it is.
  reporter: isCi
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list']],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: isCi
      ? 'pnpm run start:e2e'
      : 'pnpm run prisma:migrate:e2e && pnpm run build:e2e && pnpm run start:e2e',
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000
  },
  projects: [
    {
      name: 'seed',
      testMatch: /seed\.setup\.ts/u
    },
    {
      name: 'auth',
      testMatch: /auth\.setup\.ts/u,
      dependencies: ['seed']
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/u,
      // French is the base locale, and the runner would otherwise decide it
      // through Accept-Language: a run must not change language with its host.
      use: { ...devices['Desktop Chrome'], locale: 'fr-FR' },
      dependencies: ['auth']
    }
  ]
})
