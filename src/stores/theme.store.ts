import { createStoreContext, type Store } from '@tanstack/react-store'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie } from '~/helpers/cookie'
import { type Theme, THEME_COOKIE_KEY } from '~/lib/theme'

type ThemeState = {
  theme: Theme
}

export const createThemeActions = ({
  setState
}: Pick<Store<ThemeState>, 'setState'>) => {
  return {
    setTheme: (theme: Theme) => {
      setState(() => {
        return { theme }
      })
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
      createClientCookie(THEME_COOKIE_KEY, theme, {
        maxAge: ONE_YEAR_IN_SECONDS
      })
    }
  }
}

type ThemeStore = Store<ThemeState, ReturnType<typeof createThemeActions>>

export const {
  StoreProvider: ThemeStoreProvider,
  useStoreContext: useThemeStore
} = createStoreContext<ThemeStore>()
