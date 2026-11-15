import React from 'react'
import { useCreateStore } from '@tanstack/react-store'
import { matchIsTheme, type Theme } from '~/lib/theme'
import {
  createThemeActions,
  THEME_CHANNEL_NAME,
  ThemeStoreProvider
} from '~/stores/theme.store'

type ThemeProviderProps = {
  children: React.ReactNode
  initialTheme: Theme
}

export const ThemeProvider = ({
  children,
  initialTheme
}: ThemeProviderProps) => {
  const themeStore = useCreateStore(
    { theme: initialTheme, isForced: false },
    createThemeActions
  )

  React.useEffect(() => {
    const channel = new BroadcastChannel(THEME_CHANNEL_NAME)

    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (matchIsTheme(event.data)) {
        themeStore.actions.syncTheme(event.data)
      }
    })

    return () => {
      channel.close()
    }
  }, [themeStore])

  return <ThemeStoreProvider value={themeStore}>{children}</ThemeStoreProvider>
}
