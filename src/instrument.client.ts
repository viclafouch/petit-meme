import {
  addIntegration,
  captureException,
  init,
  reactErrorHandler,
  setTag,
  setUser,
  tanstackRouterBrowserTracingIntegration
} from '@sentry/tanstackstart-react'
import type { AnyRouter } from '@tanstack/react-router'
import {
  AUTOMATED_BROWSER_USER_AGENT,
  BROWSER_NETWORK_ERRORS,
  BROWSER_NOISE_ERRORS,
  SENTRY_DATA_COLLECTION,
  SENTRY_IGNORE_ERRORS,
  SENTRY_TRACES_SAMPLE_RATE
} from '~/constants/sentry'
import { clientEnv } from '~/env/client'
import { getDisplayMode, subscribeToDisplayMode } from '~/lib/display-mode'
import { dropExpectedError } from '~/lib/expected-error'
import { scrubSensitiveBreadcrumbs } from '~/lib/sentry-breadcrumbs'

const isAutomatedBrowser =
  navigator.webdriver || AUTOMATED_BROWSER_USER_AGENT.test(navigator.userAgent)

const isSentryEnabled =
  clientEnv.VITE_VERCEL_ENV === 'production' && !isAutomatedBrowser

init({
  dsn: clientEnv.VITE_SENTRY_DSN,
  environment: clientEnv.VITE_VERCEL_ENV,
  tunnel: true,
  enabled: isSentryEnabled,
  dataCollection: SENTRY_DATA_COLLECTION,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  allowUrls: [window.location.origin],
  denyUrls: [/extensions\//iu, /^chrome:\/\//iu, /^chrome-extension:\/\//iu],
  ignoreErrors: [
    ...SENTRY_IGNORE_ERRORS,
    ...BROWSER_NETWORK_ERRORS,
    ...BROWSER_NOISE_ERRORS
  ],
  beforeSend: dropExpectedError,
  beforeBreadcrumb: scrubSensitiveBreadcrumbs,
  initialScope: {
    tags: { display_mode: getDisplayMode() }
  }
})

subscribeToDisplayMode(() => {
  setTag('display_mode', getDisplayMode())
})

export const sentryClient = {
  captureException,
  setUser,
  reportReactError: reactErrorHandler(),
  trackRouterNavigation: (router: AnyRouter) => {
    addIntegration(tanstackRouterBrowserTracingIntegration(router))
  }
}
