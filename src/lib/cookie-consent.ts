import {
  COOKIE_ALGOLIA_USER_TOKEN_KEY,
  COOKIE_CONSENT_KEY
} from '@/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '@/constants/time'
import { createClientCookie, readClientCookie } from '@/helpers/cookie'
import { createClientOnlyFn, createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

type CookieConsentValue = 'accepted' | 'declined'

function parseCookieConsent(
  rawValue: string | undefined | null
): CookieConsentValue | null {
  if (rawValue === 'accepted' || rawValue === 'declined') {
    return rawValue
  }

  return null
}

const getCookieConsent = createIsomorphicFn()
  .server(() => {
    return parseCookieConsent(getCookie(COOKIE_CONSENT_KEY))
  })
  .client(() => {
    return parseCookieConsent(readClientCookie(COOKIE_CONSENT_KEY))
  })

const setCookieConsent = createClientOnlyFn((value: CookieConsentValue) => {
  createClientCookie(COOKIE_CONSENT_KEY, value, {
    maxAge: ONE_YEAR_IN_SECONDS
  })

  if (value === 'accepted') {
    createClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY, crypto.randomUUID(), {
      maxAge: ONE_YEAR_IN_SECONDS,
      secure: true
    })
  }
})

const hasAcceptedCookies = createClientOnlyFn(() => {
  return readClientCookie(COOKIE_CONSENT_KEY) === 'accepted'
})

export { getCookieConsent, hasAcceptedCookies, setCookieConsent }
export type { CookieConsentValue }
