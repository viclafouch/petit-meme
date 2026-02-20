import React from 'react'
import { ONE_YEAR_IN_SECONDS } from '@/constants/time'
import { createClientCookie, readClientCookie } from '@/helpers/cookie'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export type Theme = 'light' | 'dark'

const THEME_COOKIE_KEY = 'ui-theme'
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
const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined
)

type ThemeProviderProps = {
  children: React.ReactNode
  initialTheme: Theme
}

export const ThemeProvider = ({
  children,
  initialTheme
}: ThemeProviderProps) => {
  const [theme, setTheme] = React.useState<Theme>(initialTheme)

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  // eslint-disable-next-line no-restricted-syntax
  const handleSetTheme = React.useCallback(
    (newTheme: Theme) => {
      setTheme(newTheme)
      createClientCookie(THEME_COOKIE_KEY, newTheme, {
        maxAge: ONE_YEAR_IN_SECONDS
      })
    },
    [setTheme]
  )

  // eslint-disable-next-line no-restricted-syntax
  const value = React.useMemo(() => {
    return { theme, setTheme: handleSetTheme }
  }, [theme, handleSetTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
