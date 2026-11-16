import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie, readClientCookie } from '~/lib/cookie'

const PREMIUM_OVERRIDE_COOKIE_KEY = 'premiumOverride'

export const PREMIUM_OVERRIDES = ['free', 'premium'] as const

export type PremiumOverride = (typeof PREMIUM_OVERRIDES)[number]

const readPremiumOverrideCookie = createIsomorphicFn()
  .server(() => {
    return getCookie(PREMIUM_OVERRIDE_COOKIE_KEY)
  })
  .client(() => {
    return readClientCookie(PREMIUM_OVERRIDE_COOKIE_KEY)
  })

export const readPremiumOverride = (): PremiumOverride | null => {
  const value = readPremiumOverrideCookie()

  return (
    PREMIUM_OVERRIDES.find((override) => {
      return override === value
    }) ?? null
  )
}

export const writePremiumOverride = (override: PremiumOverride) => {
  createClientCookie(PREMIUM_OVERRIDE_COOKIE_KEY, override, {
    maxAge: ONE_YEAR_IN_SECONDS
  })
}
