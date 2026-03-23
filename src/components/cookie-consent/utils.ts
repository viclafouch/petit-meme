import { CONSENT_COOKIE_KEY } from '@/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '@/constants/time'
import { createClientCookie } from '@/helpers/cookie'
import type { ConsentCategories, ConsentState } from './types'

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
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as ConsentState
  } catch {
    return null
  }
}

export function matchIsAnalyticsConsented(state: ConsentState | null) {
  return state?.hasConsented === true && state.categories.analytics === true
}
