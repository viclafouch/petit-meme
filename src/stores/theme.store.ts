import { createStoreContext, type Store } from '@tanstack/react-store'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie } from '~/lib/cookie'
import { getStoredTheme, type Theme, THEME_COOKIE_KEY } from '~/lib/theme'

type ThemeState = {
  theme: Theme
  isForced: boolean
}

export const THEME_CHANNEL_NAME = 'ui-theme'

const applyThemeClass = (theme: Theme) => {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
}

const broadcastTheme = (theme: Theme) => {
  const channel = new BroadcastChannel(THEME_CHANNEL_NAME)
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel.postMessage takes no targetOrigin, it only reaches same-origin tabs
  channel.postMessage(theme)
  channel.close()
}

export const createThemeActions = ({
  setState,
  get
}: Pick<Store<ThemeState>, 'setState' | 'get'>) => {
  const showTheme = (theme: Theme, isForced: boolean) => {
    setState(() => {
      return { theme, isForced }
    })
    applyThemeClass(theme)
  }

  return {
    setTheme: (theme: Theme) => {
      showTheme(theme, false)
      createClientCookie(THEME_COOKIE_KEY, theme, {
        maxAge: ONE_YEAR_IN_SECONDS
      })
      broadcastTheme(theme)
    },
    syncTheme: (theme: Theme) => {
      if (get().isForced) {
        return
      }

      showTheme(theme, false)
    },
    forceTheme: (theme: Theme) => {
      showTheme(theme, true)
    },
    releaseForcedTheme: () => {
      showTheme(getStoredTheme(), false)
    }
  }
}

type ThemeStore = Store<ThemeState, ReturnType<typeof createThemeActions>>

export const {
  StoreProvider: ThemeStoreProvider,
  useStoreContext: useThemeStore
} = createStoreContext<ThemeStore>()
