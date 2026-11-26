import { IS_PRODUCTION } from '~/constants/env'
import { SERVICE_WORKER_PATHNAME } from '~/constants/pwa'
import { HOUR } from '~/constants/time'
import { captureWithFeature } from '~/lib/sentry'

const UNREACHABLE_SCRIPT_MESSAGE =
  /An unknown error occurred when fetching the script|bad HTTP response code \(407\)|^Script .+ load failed$|^Rejected$/u

const matchIsScriptUnreachable = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return UNREACHABLE_SCRIPT_MESSAGE.test(message)
}

const checkForUpdate = async (registration: ServiceWorkerRegistration) => {
  try {
    await registration.update()

    return true
  } catch {
    return false
  }
}

const checkForUpdateWhenVisible = (registration: ServiceWorkerRegistration) => {
  let lastCheckAt = Date.now()

  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState !== 'visible' ||
      Date.now() - lastCheckAt < HOUR
    ) {
      return
    }

    lastCheckAt = Date.now()
    void checkForUpdate(registration)
  })
}

const registerWorker = async () => {
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATHNAME, {
      scope: '/',
      updateViaCache: 'none'
    })
  } catch (error) {
    if (!matchIsScriptUnreachable(error)) {
      captureWithFeature(error, 'service-worker')
    }

    return null
  }
}

const register = async () => {
  const registration = await registerWorker()

  if (registration) {
    checkForUpdateWhenVisible(registration)
  }
}

export const registerServiceWorker = () => {
  if (!IS_PRODUCTION || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener(
    'load',
    () => {
      void register()
    },
    { once: true }
  )
}
