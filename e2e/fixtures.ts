import { test as base } from '@playwright/test'
import type { ConsentState } from '~/components/cookie-consent/types'
import { CONSENT_COOKIE_KEY, CONSENT_VERSION } from '~/constants/cookie'

const ACCEPTED_CONSENT = {
  hasConsented: true,
  categories: { necessary: true, analytics: true },
  consentVersion: CONSENT_VERSION,
  lastUpdated: null
} as const satisfies ConsentState

// Every test starts with the consent banner already answered. The banner has
// its own test, and nothing else should have to walk past it.
export const test = base.extend({
  context: async ({ context, baseURL }, provide) => {
    await context.addCookies([
      {
        name: CONSENT_COOKIE_KEY,
        value: JSON.stringify(ACCEPTED_CONSENT),
        url: baseURL
      }
    ])

    await provide(context)
  }
})

export { expect } from '@playwright/test'
