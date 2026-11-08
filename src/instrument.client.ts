import * as Sentry from '@sentry/tanstackstart-react'
import {
  AUTOMATED_BROWSER_USER_AGENT,
  BROWSER_NETWORK_ERRORS,
  BROWSER_NOISE_ERRORS,
  SENTRY_APPLICATION_KEY,
  SENTRY_DATA_COLLECTION,
  SENTRY_IGNORE_ERRORS,
  SENTRY_TRACES_SAMPLE_RATE
} from '~/constants/sentry'
import { clientEnv } from '~/env/client'
import { dropExpectedError } from '~/lib/expected-error'
import {
  getFeedbackOptions,
  scrubSensitiveBreadcrumbs,
  SENSITIVE_API_PATTERNS
} from '~/lib/sentry'

const isAutomatedBrowser =
  navigator.webdriver || AUTOMATED_BROWSER_USER_AGENT.test(navigator.userAgent)

const isSentryEnabled =
  clientEnv.VITE_VERCEL_ENV === 'production' && !isAutomatedBrowser

Sentry.init({
  dsn: clientEnv.VITE_SENTRY_DSN,
  environment: clientEnv.VITE_VERCEL_ENV,
  enabled: isSentryEnabled,
  dataCollection: SENTRY_DATA_COLLECTION,
  integrations: [
    Sentry.feedbackIntegration(getFeedbackOptions()),
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: [SENTRY_APPLICATION_KEY],
      behaviour: 'drop-error-if-exclusively-contains-third-party-frames'
    })
  ],
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
  denyUrls: [/extensions\//iu, /^chrome:\/\//iu, /^chrome-extension:\/\//iu],
  ignoreErrors: [
    ...SENTRY_IGNORE_ERRORS,
    ...BROWSER_NETWORK_ERRORS,
    ...BROWSER_NOISE_ERRORS
  ],
  beforeSend: dropExpectedError,
  beforeBreadcrumb: scrubSensitiveBreadcrumbs
})

const addReplayIntegration = async () => {
  try {
    const { replayIntegration } = await import('@sentry/browser')

    Sentry.addIntegration(
      replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        networkDetailDenyUrls: SENSITIVE_API_PATTERNS
      })
    )
  } catch (error) {
    Sentry.captureException(error)
  }
}

if (isSentryEnabled) {
  window.addEventListener(
    'load',
    () => {
      void addReplayIntegration()
    },
    { once: true }
  )
}
