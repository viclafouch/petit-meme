import type { AnyRouter } from '@tanstack/react-router'
import { createClientOnlyFn } from '@tanstack/react-start'

type SentryClient = (typeof import('~/instrument.client'))['sentryClient']

type SentryTask = (sentryClient: SentryClient) => void

type SentryUser = Parameters<SentryClient['setUser']>[0]

let resolveSentryClient: (sentryClient: SentryClient | null) => void = () => {}

const sentryClientPromise = new Promise<SentryClient | null>((resolve) => {
  resolveSentryClient = resolve
})

const earlyErrors: unknown[] = []

const keepEarlyError = (event: ErrorEvent) => {
  earlyErrors.push(event.error ?? event.message)
}

const keepEarlyRejection = (event: PromiseRejectionEvent) => {
  earlyErrors.push(event.reason)
}

export const keepEarlyErrors = createClientOnlyFn(() => {
  window.addEventListener('error', keepEarlyError)
  window.addEventListener('unhandledrejection', keepEarlyRejection)
})

const stopKeepingEarlyErrors = () => {
  window.removeEventListener('error', keepEarlyError)
  window.removeEventListener('unhandledrejection', keepEarlyRejection)
}

export const loadSentry = createClientOnlyFn(async () => {
  try {
    const { sentryClient } = await import('~/instrument.client')

    for (const error of earlyErrors.splice(0)) {
      sentryClient.captureException(error)
    }

    resolveSentryClient(sentryClient)
  } catch {
    earlyErrors.length = 0
    resolveSentryClient(null)
  } finally {
    stopKeepingEarlyErrors()
  }
})

export const waitForSentry = () => {
  return sentryClientPromise
}

export const whenSentryLoads = async (task: SentryTask) => {
  const sentryClient = await waitForSentry()

  if (sentryClient) {
    task(sentryClient)
  }
}

export const reportReactError = (
  ...reactError: Parameters<SentryClient['reportReactError']>
) => {
  void whenSentryLoads((sentryClient) => {
    sentryClient.reportReactError(...reactError)
  })
}

export const setSentryUser = (user: SentryUser) => {
  void whenSentryLoads((sentryClient) => {
    sentryClient.setUser(user)
  })
}

export const trackRouterNavigation = (router: AnyRouter) => {
  void whenSentryLoads((sentryClient) => {
    sentryClient.trackRouterNavigation(router)
  })
}
