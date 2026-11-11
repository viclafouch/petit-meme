import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { CONSENT_COOKIE_KEY } from '~/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import {
  type CategoryConfig,
  type ConsentState,
  matchIsAnalyticsConsented,
  parseConsentCookie
} from '~/helpers/cookie-consent'
import { createClientCookie, readClientCookie } from '~/lib/cookie'
import { m } from '~/paraglide/messages.js'

export const getCookieConsentCategories = (): readonly CategoryConfig[] => {
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

export const matchIsAnalyticsConsentGiven = () => {
  return matchIsAnalyticsConsented(getConsentState())
}

export const saveConsentState = (state: ConsentState) => {
  createClientCookie(CONSENT_COOKIE_KEY, JSON.stringify(state), {
    maxAge: ONE_YEAR_IN_SECONDS
  })
}
