import React from 'react'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { readClientCookie } from '~/helpers/cookie'

export type Theme = 'light' | 'dark'

export const THEME_COOKIE_KEY = 'ui-theme'
const DEFAULT_THEME: Theme = 'dark'

export const getStoredTheme = createIsomorphicFn()
  .server((): Theme => {
    const value = getCookie(THEME_COOKIE_KEY)

    return value === 'light' || value === 'dark' ? value : DEFAULT_THEME
  })
  .client((): Theme => {
    const value = readClientCookie(THEME_COOKIE_KEY)

    return value === 'light' || value === 'dark' ? value : DEFAULT_THEME
  })

type ThemeContextProps = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined
)
