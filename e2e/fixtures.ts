import { expect, test as base } from '@playwright/test'
import { prismaClient } from '~/db'
import type { ConsentState } from '~/components/cookie-consent/types'
import { CONSENT_COOKIE_KEY, CONSENT_VERSION } from '~/constants/cookie'
import { PREMIUM_REMINDER_STORAGE_KEY } from '~/constants/plan'

const ACCEPTED_CONSENT = {
  hasConsented: true,
  categories: { necessary: true, analytics: true },
  consentVersion: CONSENT_VERSION,
  lastUpdated: null
} as const satisfies ConsentState

type E2eWorkerFixtures = {
  prismaConnection: typeof prismaClient
}

// Every test starts with the consent banner already answered, and with the
// premium reminder snoozed. Both speak on their own, five seconds into a
// `/memes` page for the reminder, and a dialog that opens itself in the middle
// of a scenario steals the click that scenario was about to make. Each has its
// own test, and nothing else should have to walk past them.
//
// Uncaught errors on our own pages fail the test that saw them. One of them
// kills hydration, which leaves buttons that look perfect and do nothing, and
// surfaces minutes later as a timeout with no clue about the cause. Errors
// raised by third party pages, Stripe above all, are not ours to judge.
export const test = base.extend<object, E2eWorkerFixtures>({
  context: async ({ context, baseURL }, provide) => {
    await context.addCookies([
      {
        name: CONSENT_COOKIE_KEY,
        value: JSON.stringify(ACCEPTED_CONSENT),
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
  // Specs read the database to check what a flow wrote. Closing the pool once
  // per worker beats repeating an `afterAll` in every one of them.
  prismaConnection: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright reads the destructuring to find a fixture's dependencies, and this one has none
    async ({}, provide) => {
      await provide(prismaClient)
      await prismaClient.$disconnect()
    },
    { scope: 'worker', auto: true }
  ]
})

export { expect } from '@playwright/test'
