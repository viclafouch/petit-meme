import { COOKIE_LOCALE_BANNER_DISMISSED_KEY } from '~/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie, readClientCookie } from '~/helpers/cookie'
import { createClientOnlyFn, createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export const getLocaleBannerDismissed = createIsomorphicFn()
  .server(() => {
    return getCookie(COOKIE_LOCALE_BANNER_DISMISSED_KEY) === '1'
  })
  .client(() => {
    return readClientCookie(COOKIE_LOCALE_BANNER_DISMISSED_KEY) === '1'
  })

export const dismissLocaleBanner = createClientOnlyFn(() => {
  createClientCookie(COOKIE_LOCALE_BANNER_DISMISSED_KEY, '1', {
    maxAge: ONE_YEAR_IN_SECONDS
  })
})
