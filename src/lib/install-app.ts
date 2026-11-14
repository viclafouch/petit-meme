import { track } from '@vercel/analytics'
import { INSTALL_OFFER_STORAGE_KEY } from '~/constants/pwa'
import { resolveInstallMethod, type InstallMethod } from '~/helpers/install-app'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallableNavigator = Navigator & {
  install?: () => Promise<void>
  standalone?: boolean
}

const matchIsInstallPromptEvent = (
  event: Event
): event is InstallPromptEvent => {
  return 'prompt' in event && 'userChoice' in event
}

const STANDALONE_QUERY = '(display-mode: standalone)'

const APP_INSTALLED_EVENT = 'App Installed'
const APP_LAUNCHED_EVENT = 'App Launched'

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

const matchIsStandalone = () => {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    getNavigator().standalone === true
  )
}

export const getInstallMethod = (): InstallMethod => {
  return resolveInstallMethod({
    isStandalone: matchIsStandalone(),
    hasInstallApi: typeof getNavigator().install === 'function',
    hasDeferredPrompt: deferredPrompt !== null,
    hasIosHomeScreenFlag: 'standalone' in getNavigator()
  })
}

export const getServerInstallMethod = () => {
  return null
}

export const matchWasInstallOffered = () => {
  return localStorage.getItem(INSTALL_OFFER_STORAGE_KEY) !== null
}

export const markInstallOffered = () => {
  localStorage.setItem(INSTALL_OFFER_STORAGE_KEY, String(Date.now()))
}

export const subscribeToInstallMethod = (listener: () => void) => {
  const standaloneQuery = window.matchMedia(STANDALONE_QUERY)

  listeners.add(listener)
  standaloneQuery.addEventListener('change', listener)

  return () => {
    listeners.delete(listener)
    standaloneQuery.removeEventListener('change', listener)
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
  track(APP_INSTALLED_EVENT)
}

export const trackAppInstallation = () => {
  if (matchIsStandalone()) {
    track(APP_LAUNCHED_EVENT)
  }

  window.addEventListener('appinstalled', trackAppInstalled)

  return () => {
    window.removeEventListener('appinstalled', trackAppInstalled)
  }
}

const installWithBrowserApi = async () => {
  const { install } = getNavigator()

  if (typeof install !== 'function') {
    return false
  }

  try {
    await install.call(navigator)

    return true
  } catch {
    return deferredPrompt === null
  }
}

const installWithDeferredPrompt = async () => {
  const prompt = deferredPrompt

  if (prompt === null) {
    return false
  }

  deferredPrompt = null
  notify()
  await prompt.prompt()
  await prompt.userChoice

  return true
}

export const promptNativeInstall = async () => {
  if (await installWithBrowserApi()) {
    return true
  }

  return installWithDeferredPrompt()
}
