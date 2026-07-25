import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import {
  COOKIE_ALGOLIA_USER_TOKEN_KEY,
  COOKIE_ANON_ID_KEY
} from '~/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie, readClientCookie } from '~/helpers/cookie'

export const ensureAlgoliaUserToken = createIsomorphicFn()
  .server(() => {
    const existingToken = getCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)

    if (existingToken) {
      return existingToken
    }

    const token = getCookie(COOKIE_ANON_ID_KEY) ?? crypto.randomUUID()

    setCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY, token, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_YEAR_IN_SECONDS
    })

    return token
  })
  .client(() => {
    const existingToken = readClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)

    if (existingToken) {
      return existingToken
    }

    const token = readClientCookie(COOKIE_ANON_ID_KEY) ?? crypto.randomUUID()

    createClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY, token, {
      maxAge: ONE_YEAR_IN_SECONDS
    })

    return token
  })
