import React from 'react'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie } from '~/helpers/cookie'
import { type Theme, THEME_COOKIE_KEY, ThemeContext } from '~/lib/theme'

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

  const handleSetTheme = React.useCallback(
    (newTheme: Theme) => {
      setTheme(newTheme)
      createClientCookie(THEME_COOKIE_KEY, newTheme, {
        maxAge: ONE_YEAR_IN_SECONDS
      })
    },
    [setTheme]
  )

  const value = React.useMemo(() => {
    return { theme, setTheme: handleSetTheme }
  }, [theme, handleSetTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
