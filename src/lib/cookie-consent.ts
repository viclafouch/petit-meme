import type {
  CategoryConfig,
  ConsentState,
  CookieConsentConfig
} from '~/components/cookie-consent'
import {
  matchIsAnalyticsConsented,
  parseConsentCookie
} from '~/components/cookie-consent'
import { CONSENT_COOKIE_KEY } from '~/constants/cookie'
import { readClientCookie } from '~/helpers/cookie'
import { m } from '~/paraglide/messages.js'
import { createClientOnlyFn, createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

const CONSENT_VERSION = '1.0.0'

export function getCookieConsentConfig(): CookieConsentConfig {
  const categories = [
    {
      key: 'necessary',
      label: m.cookie_category_necessary_label(),
      description: m.cookie_category_necessary_description(),
      required: true
    },
    {
      key: 'analytics',
      label: m.cookie_category_analytics_label(),
      description: m.cookie_category_analytics_description()
    }
  ] as const satisfies readonly CategoryConfig[]

  return {
    consentVersion: CONSENT_VERSION,
    privacyPolicyUrl: '/privacy',
    categories
  }
}

export const getConsentState = createIsomorphicFn()
  .server(() => {
    return parseConsentCookie(getCookie(CONSENT_COOKIE_KEY))
  })
  .client(() => {
    return parseConsentCookie(readClientCookie(CONSENT_COOKIE_KEY))
  })

export const matchIsAnalyticsConsentGiven = createIsomorphicFn()
  .server(() => {
    return matchIsAnalyticsConsented(
      parseConsentCookie(getCookie(CONSENT_COOKIE_KEY))
    )
  })
  .client(() => {
    return matchIsAnalyticsConsented(
      parseConsentCookie(readClientCookie(CONSENT_COOKIE_KEY))
    )
  })

export const matchHasAcceptedCookies = createClientOnlyFn(() => {
  return matchIsAnalyticsConsentGiven()
})

export type { ConsentState }
