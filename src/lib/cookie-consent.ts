import { COOKIE_CONSENT_KEY } from '@/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '@/constants/time'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

type CookieConsentValue = 'accepted' | 'declined'

const CONSENT_COOKIE_REGEX = new RegExp(`(?:^|; )${COOKIE_CONSENT_KEY}=([^;]*)`)

function parseCookieConsent(
  rawValue: string | undefined | null
): CookieConsentValue | null {
  if (rawValue === 'accepted' || rawValue === 'declined') {
    return rawValue
  }

  return null
}

function readClientCookieConsent() {
  const match = document.cookie.match(CONSENT_COOKIE_REGEX)

  return match?.[1]
}

const getCookieConsent = createIsomorphicFn()
  .server(() => {
    return parseCookieConsent(getCookie(COOKIE_CONSENT_KEY))
  })
  .client(() => {
    return parseCookieConsent(readClientCookieConsent())
  })

function setCookieConsent(value: CookieConsentValue) {
  document.cookie = `${COOKIE_CONSENT_KEY}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
}

function hasAcceptedCookies() {
  return readClientCookieConsent() === 'accepted'
}

export { getCookieConsent, hasAcceptedCookies, setCookieConsent }
export type { CookieConsentValue }
