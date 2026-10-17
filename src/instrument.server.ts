import * as Sentry from '@sentry/tanstackstart-react'
import { IS_PRODUCTION } from '~/constants/env'
import {
  SENTRY_DATA_COLLECTION,
  SENTRY_IGNORE_ERRORS,
  SENTRY_TRACES_SAMPLE_RATE
} from '~/constants/sentry'
import { processEnvironment } from '~/env/process'

const deploymentEnv =
  processEnvironment.VERCEL_ENV ??
  (IS_PRODUCTION ? 'production' : 'development')

const FULL_SAMPLE_RATE = 1
const DROP_SAMPLE_RATE = 0

Sentry.init({
  dsn: processEnvironment.VITE_SENTRY_DSN,
  environment: deploymentEnv,
  enabled: deploymentEnv === 'production',
  dataCollection: SENTRY_DATA_COLLECTION,
  tracesSampler: ({ attributes, inheritOrSampleWith }) => {
    const urlPath = attributes['url.path']

    if (typeof urlPath !== 'string') {
      return inheritOrSampleWith(SENTRY_TRACES_SAMPLE_RATE)
    }

    if (urlPath === '/api/auth/stripe/webhook') {
      return FULL_SAMPLE_RATE
    }

    if (urlPath.includes('/health') || urlPath.includes('/favicon')) {
      return DROP_SAMPLE_RATE
    }

    return inheritOrSampleWith(SENTRY_TRACES_SAMPLE_RATE)
  },
  ignoreErrors: SENTRY_IGNORE_ERRORS
})
