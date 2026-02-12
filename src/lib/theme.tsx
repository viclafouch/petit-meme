import React from 'react'
import { ONE_YEAR_IN_SECONDS } from '@/constants/time'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export type UserTheme = 'light' | 'dark' | 'system'
export type AppTheme = Exclude<UserTheme, 'system'>

const THEME_COOKIE_KEY = 'ui-theme'

const VALID_THEMES = [
  'light',
  'dark',
  'system'
] as const satisfies readonly UserTheme[]

export const getStoredTheme = createIsomorphicFn()
  .server(() => {
    return (getCookie(THEME_COOKIE_KEY) || 'system') as UserTheme
  })
  .client(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]*)`)
    )
    const value = match?.[1]

    if (value && VALID_THEMES.includes(value as UserTheme)) {
      return value as UserTheme
    }

    return 'system' as UserTheme
  })

export function setStoredTheme(theme: UserTheme) {
  document.cookie = `${THEME_COOKIE_KEY}=${theme}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
}

function getSystemTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function handleThemeChange(theme: UserTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  const newTheme = theme === 'system' ? getSystemTheme() : theme
  root.classList.add(newTheme)
}

function setupPreferredListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handler = () => {
    return handleThemeChange('system')
  }

  mediaQuery.addEventListener('change', handler)

  return () => {
    return mediaQuery.removeEventListener('change', handler)
  }
}

type ThemeContextProps = {
  userTheme: UserTheme
  appTheme: AppTheme
  setTheme: (theme: UserTheme) => void
}
const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined
)

type ThemeProviderProps = {
  children: React.ReactNode
  initialTheme: UserTheme
}

export const ThemeProvider = ({
  children,
  initialTheme
}: ThemeProviderProps) => {
  const [userTheme, setUserTheme] = React.useState<UserTheme>(initialTheme)

  React.useEffect(() => {
    handleThemeChange(userTheme)

    if (userTheme === 'system') {
      return setupPreferredListener()
    }

    return () => {}
  }, [userTheme])

  const appTheme: AppTheme =
    userTheme === 'system' ? getSystemTheme() : userTheme

  // eslint-disable-next-line no-restricted-syntax
  const setTheme = React.useCallback((newUserTheme: UserTheme) => {
    setUserTheme(newUserTheme)
    setStoredTheme(newUserTheme)
  }, [])

  // eslint-disable-next-line no-restricted-syntax
  const value = React.useMemo(() => {
    return { userTheme, appTheme, setTheme }
  }, [userTheme, appTheme, setTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
