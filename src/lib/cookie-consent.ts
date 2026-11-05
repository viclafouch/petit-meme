import { createClientOnlyFn, createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import type { CategoryConfig } from '~/components/cookie-consent/types'
import {
  matchIsAnalyticsConsented,
  parseConsentCookie
} from '~/components/cookie-consent/utils'
import { CONSENT_COOKIE_KEY } from '~/constants/cookie'
import { readClientCookie } from '~/helpers/cookie'
import { m } from '~/paraglide/messages.js'

export function getCookieConsentCategories(): readonly CategoryConfig[] {
  return [
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
  ]
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
