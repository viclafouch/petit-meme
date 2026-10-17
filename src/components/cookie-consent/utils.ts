import { z } from 'zod'
import { CONSENT_COOKIE_KEY } from '~/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie } from '~/helpers/cookie'
import type { ConsentCategories, ConsentState } from './types'

const CONSENT_STATE_SCHEMA = z.object({
  hasConsented: z.boolean(),
  categories: z.object({
    necessary: z.boolean(),
    analytics: z.boolean()
  }),
  consentVersion: z.string(),
  lastUpdated: z.string().nullable()
}) satisfies z.ZodType<ConsentState>

export function getDefaultCategories(): ConsentCategories {
  return {
    necessary: true,
    analytics: false
  }
}

export function getAllAcceptedCategories(): ConsentCategories {
  return {
    necessary: true,
    analytics: true
  }
}

export function saveConsentState(state: ConsentState) {
  createClientCookie(CONSENT_COOKIE_KEY, JSON.stringify(state), {
    maxAge: ONE_YEAR_IN_SECONDS
  })
}

export function parseConsentCookie(
  rawValue: string | undefined | null
): ConsentState | null {
  if (rawValue === undefined || !rawValue) {
    return null
  }

  try {
    const result = CONSENT_STATE_SCHEMA.safeParse(JSON.parse(rawValue))

    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function matchIsAnalyticsConsented(state: ConsentState | null) {
  return state?.hasConsented === true && state.categories.analytics
}
