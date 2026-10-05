import { expect, test as base } from '@playwright/test'
import { prismaClient } from '~/db'
import type { ConsentState } from '~/components/cookie-consent/types'
import {
  CONSENT_COOKIE_KEY,
  CONSENT_VERSION,
  COOKIE_LOCALE_BANNER_DISMISSED_KEY
} from '~/constants/cookie'
import { PREMIUM_REMINDER_STORAGE_KEY } from '~/constants/plan'

const ACCEPTED_CONSENT = {
  hasConsented: true,
  categories: { necessary: true, analytics: true },
  consentVersion: CONSENT_VERSION,
  lastUpdated: null
} as const satisfies ConsentState

type E2eWorkerFixtures = {
  prismaClosedOncePerWorker: typeof prismaClient
}

export const test = base.extend<object, E2eWorkerFixtures>({
  context: async ({ context, baseURL }, provide) => {
    await context.addCookies([
      {
        name: CONSENT_COOKIE_KEY,
        value: JSON.stringify(ACCEPTED_CONSENT),
        url: baseURL
      },
      {
        name: COOKIE_LOCALE_BANNER_DISMISSED_KEY,
        value: '1',
        url: baseURL
      }
    ])

    await context.addInitScript((storageKey) => {
      localStorage.setItem(storageKey, String(Date.now()))
    }, PREMIUM_REMINDER_STORAGE_KEY)

    const pageErrors: string[] = []

    context.on('weberror', (webError) => {
      const url = webError.page()?.url() ?? ''

      if (baseURL && url.startsWith(baseURL)) {
        pageErrors.push(webError.error().message)
      }
    })

    await provide(context)

    expect(pageErrors, 'uncaught errors on our own pages').toEqual([])
  },
  prismaClosedOncePerWorker: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright reads the destructuring to find a fixture's dependencies, and this one has none
    async ({}, provide) => {
      await provide(prismaClient)
      await prismaClient.$disconnect()
    },
    { scope: 'worker', auto: true }
  ]
})

export { expect } from '@playwright/test'
