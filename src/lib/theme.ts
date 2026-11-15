import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { readClientCookie } from '~/lib/cookie'

export type Theme = 'light' | 'dark'

export const THEME_COOKIE_KEY = 'ui-theme'
const DEFAULT_THEME: Theme = 'dark'

export const matchIsTheme = (value: unknown): value is Theme => {
  return value === 'light' || value === 'dark'
}

export const getStoredTheme = createIsomorphicFn()
  .server((): Theme => {
    const value = getCookie(THEME_COOKIE_KEY)

    return matchIsTheme(value) ? value : DEFAULT_THEME
  })
  .client((): Theme => {
    const value = readClientCookie(THEME_COOKIE_KEY)

    return matchIsTheme(value) ? value : DEFAULT_THEME
  })
