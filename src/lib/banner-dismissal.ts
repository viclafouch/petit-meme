import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import type { BannerDismissal } from '~/constants/banner'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie, readClientCookie } from '~/lib/cookie'

const readCookie = createIsomorphicFn()
  .server((name: string) => {
    return getCookie(name)
  })
  .client((name: string) => {
    return readClientCookie(name)
  })

export const isBannerDismissed = ({
  cookieKey,
  dismissedValue
}: BannerDismissal) => {
  return readCookie(cookieKey) === dismissedValue
}

export const dismissBanner = ({
  cookieKey,
  dismissedValue
}: BannerDismissal) => {
  createClientCookie(cookieKey, dismissedValue, {
    maxAge: ONE_YEAR_IN_SECONDS
  })
}
