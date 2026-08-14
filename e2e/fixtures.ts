import { expect, test as base } from '@playwright/test'
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
//
// Uncaught errors on our own pages fail the test that saw them. One of them
// kills hydration, which leaves buttons that look perfect and do nothing, and
// surfaces minutes later as a timeout with no clue about the cause. Errors
// raised by third party pages, Stripe above all, are not ours to judge.
export const test = base.extend({
  context: async ({ context, baseURL }, provide) => {
    await context.addCookies([
      {
        name: CONSENT_COOKIE_KEY,
        value: JSON.stringify(ACCEPTED_CONSENT),
        url: baseURL
      }
    ])

    const pageErrors: string[] = []

    context.on('weberror', (webError) => {
      const url = webError.page()?.url() ?? ''

      if (baseURL && url.startsWith(baseURL)) {
        pageErrors.push(webError.error().message)
      }
    })

    await provide(context)

    expect(pageErrors, 'uncaught errors on our own pages').toEqual([])
  }
})

export { expect } from '@playwright/test'
