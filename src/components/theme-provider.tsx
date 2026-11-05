import type React from 'react'
import { useCreateStore } from '@tanstack/react-store'
import type { Theme } from '~/lib/theme'
import { createThemeActions, ThemeStoreProvider } from '~/stores/theme.store'

type ThemeProviderProps = {
  children: React.ReactNode
  initialTheme: Theme
}

export const ThemeProvider = ({
  children,
  initialTheme
}: ThemeProviderProps) => {
  const themeStore = useCreateStore({ theme: initialTheme }, createThemeActions)

  return <ThemeStoreProvider value={themeStore}>{children}</ThemeStoreProvider>
}
