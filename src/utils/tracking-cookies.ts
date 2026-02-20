import {
  COOKIE_ALGOLIA_USER_TOKEN_KEY,
  COOKIE_ANON_ID_KEY
} from '@/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '@/constants/time'
import { createClientCookie, readClientCookie } from '@/helpers/cookie'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'

export const ensureAlgoliaUserToken = createIsomorphicFn()
  .server((fallbackToken?: string) => {
    if (getCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)) {
      return
    }

    const value =
      fallbackToken ?? getCookie(COOKIE_ANON_ID_KEY) ?? crypto.randomUUID()

    setCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY, value, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_YEAR_IN_SECONDS
    })
  })
  .client((fallbackToken?: string) => {
    if (readClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)) {
      return
    }

    const value =
      fallbackToken ??
      readClientCookie(COOKIE_ANON_ID_KEY) ??
      crypto.randomUUID()

    createClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY, value, {
      maxAge: ONE_YEAR_IN_SECONDS,
      secure: true
    })
  })
