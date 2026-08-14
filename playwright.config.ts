import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL } from './e2e/env'

const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: isCi ? [['html', { open: 'never' }], ['github']] : [['list']],
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
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth']
    }
  ]
})
