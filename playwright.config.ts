import { defineConfig, devices } from '@playwright/test'
import { E2E_BASE_URL, IS_CI } from './e2e/env'

const FAKE_ANTHROPIC_PORT = '3101'
const FAKE_ANTHROPIC_URL = `http://127.0.0.1:${FAKE_ANTHROPIC_PORT}`

const APP_READINESS_URL = new URL('/health', E2E_BASE_URL).href

const SERVER_LOG_DIRECTORY = 'e2e/.logs'
const START_SERVER = `mkdir -p ${SERVER_LOG_DIRECTORY} && pnpm run start:e2e > ${SERVER_LOG_DIRECTORY}/server.log 2>&1`

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  timeout: 30_000,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: 3,
  reporter: IS_CI
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
      command: `node e2e/fake-anthropic.ts --port ${FAKE_ANTHROPIC_PORT}`,
      url: FAKE_ANTHROPIC_URL
    },
    {
      name: 'App',
      command: IS_CI
        ? START_SERVER
        : `pnpm run prisma:migrate:e2e && pnpm run build:e2e && ${START_SERVER}`,
      url: APP_READINESS_URL,
      env: { ANTHROPIC_BASE_URL: FAKE_ANTHROPIC_URL },
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
