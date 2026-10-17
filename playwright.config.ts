import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL } from './e2e/env'

const isCi = Boolean(process.env.CI)

const FAKE_ANTHROPIC_PORT = '3101'
const FAKE_ANTHROPIC_URL = `http://127.0.0.1:${FAKE_ANTHROPIC_PORT}`

const SERVER_LOG_DIRECTORY = 'e2e/.logs'
const START_SERVER = `mkdir -p ${SERVER_LOG_DIRECTORY} && pnpm run start:e2e > ${SERVER_LOG_DIRECTORY}/server.log 2>&1`

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  timeout: 30_000,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: isCi
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list']],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      name: 'Fake Anthropic',
      command: 'node e2e/fake-anthropic.ts',
      url: FAKE_ANTHROPIC_URL,
      env: { PORT: FAKE_ANTHROPIC_PORT },
      reuseExistingServer: false
    },
    {
      name: 'App',
      command: isCi
        ? START_SERVER
        : `pnpm run prisma:migrate:e2e && pnpm run build:e2e && ${START_SERVER}`,
      url: E2E_BASE_URL,
      env: { ANTHROPIC_BASE_URL: FAKE_ANTHROPIC_URL },
      reuseExistingServer: false,
      timeout: 300_000
    }
  ],
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
      testIgnore: /.*\.mobile\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'], locale: 'fr-FR' },
      dependencies: ['auth']
    },
    {
      name: 'mobile-safari',
      testMatch: /.*\.mobile\.spec\.ts/u,
      use: { ...devices['iPhone 15'], locale: 'fr-FR' },
      dependencies: ['auth']
    }
  ]
})
