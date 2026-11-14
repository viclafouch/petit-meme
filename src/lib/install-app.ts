import { track } from '@vercel/analytics'
import { INSTALL_OFFER_STORAGE_KEY } from '~/constants/pwa'
import { resolveInstallMethod, type InstallMethod } from '~/helpers/install-app'
import { matchIsStandalone, subscribeToDisplayMode } from '~/lib/display-mode'
import { captureWithFeature } from '~/lib/sentry'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallableNavigator = Navigator & {
  install?: () => Promise<void>
}

export type InstallSurface =
  | 'account-drawer'
  | 'home'
  | 'app-page'
  | 'export-toast'

type NativeInstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

const INSTALL_ANALYTICS_EVENTS = {
  offerShown: 'Install Offer Shown',
  clicked: 'Install Clicked',
  promptAnswered: 'Install Prompt Answered',
  installed: 'App Installed',
  launched: 'App Launched',
  firstLaunch: 'App First Launch'
} as const

const FIRST_LAUNCH_STORAGE_KEY = 'app-first-launch-at'

const matchIsInstallPromptEvent = (
  event: Event
): event is InstallPromptEvent => {
  return 'prompt' in event && 'userChoice' in event
}

const matchIsDismissal = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError'
}

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

const notify = () => {
  for (const listener of listeners) {
    listener()
  }
}

const getNavigator = () => {
  return navigator as InstallableNavigator
}

export const getInstallMethod = (): InstallMethod => {
  return resolveInstallMethod({
    isStandalone: matchIsStandalone(),
    hasInstallApi: typeof getNavigator().install === 'function',
    hasDeferredPrompt: deferredPrompt !== null,
    hasIosHomeScreenFlag: 'standalone' in navigator
  })
}

export const getServerInstallMethod = () => {
  return null
}

export const matchWasInstallOffered = () => {
  return localStorage.getItem(INSTALL_OFFER_STORAGE_KEY) !== null
}

export const recordInstallOffer = () => {
  localStorage.setItem(INSTALL_OFFER_STORAGE_KEY, String(Date.now()))
  track(INSTALL_ANALYTICS_EVENTS.offerShown, { surface: 'export-toast' })
}

export const subscribeToInstallMethod = (listener: () => void) => {
  listeners.add(listener)
  const unsubscribeFromDisplayMode = subscribeToDisplayMode(listener)

  return () => {
    listeners.delete(listener)
    unsubscribeFromDisplayMode()
  }
}

export const captureInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (event) => {
    if (!matchIsInstallPromptEvent(event)) {
      return
    }

    event.preventDefault()
    deferredPrompt = event
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

const trackAppInstalled = () => {
  track(INSTALL_ANALYTICS_EVENTS.installed)
}

const trackStandaloneLaunch = () => {
  track(INSTALL_ANALYTICS_EVENTS.launched)

  if (localStorage.getItem(FIRST_LAUNCH_STORAGE_KEY) === null) {
    localStorage.setItem(FIRST_LAUNCH_STORAGE_KEY, String(Date.now()))
    track(INSTALL_ANALYTICS_EVENTS.firstLaunch)
  }
}

export const trackAppInstallation = () => {
  if (matchIsStandalone()) {
    trackStandaloneLaunch()
  }

  window.addEventListener('appinstalled', trackAppInstalled)

  return () => {
    window.removeEventListener('appinstalled', trackAppInstalled)
  }
}

type TrackInstallClickedParams = {
  surface: InstallSurface
  method: Exclude<InstallMethod, 'installed'>
}

export const trackInstallClicked = ({
  surface,
  method
}: TrackInstallClickedParams) => {
  track(INSTALL_ANALYTICS_EVENTS.clicked, { surface, method })
}

type TrackInstallPromptAnsweredParams = {
  surface: InstallSurface
  outcome: Exclude<NativeInstallOutcome, 'unavailable'>
}

export const trackInstallPromptAnswered = ({
  surface,
  outcome
}: TrackInstallPromptAnsweredParams) => {
  track(INSTALL_ANALYTICS_EVENTS.promptAnswered, { surface, outcome })
}

const installWithBrowserApi = async (): Promise<NativeInstallOutcome> => {
  const { install } = getNavigator()

  if (typeof install !== 'function') {
    return 'unavailable'
  }

  try {
    await install.call(navigator)

    return 'accepted'
  } catch (error) {
    if (matchIsDismissal(error)) {
      return 'dismissed'
    }

    captureWithFeature(error, 'install-app')

    return 'unavailable'
  }
}

const installWithDeferredPrompt = async (): Promise<NativeInstallOutcome> => {
  const prompt = deferredPrompt

  if (prompt === null) {
    return 'unavailable'
  }

  deferredPrompt = null
  notify()

  try {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice

    return outcome
  } catch (error) {
    captureWithFeature(error, 'install-app')

    return 'unavailable'
  }
}

export const promptNativeInstall = async () => {
  const browserApiOutcome = await installWithBrowserApi()

  if (browserApiOutcome !== 'unavailable') {
    return browserApiOutcome
  }

  return installWithDeferredPrompt()
}
