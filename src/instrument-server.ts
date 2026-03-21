import { IS_PRODUCTION } from '@/constants/env'
import * as Sentry from '@sentry/tanstackstart-react'

const FULL_SAMPLE_RATE = 1.0
const DROP_SAMPLE_RATE = 0
const DEFAULT_SAMPLE_RATE = 0.2

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie']

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  enabled: IS_PRODUCTION,
  sendDefaultPii: false,
  tracesSampler: (samplingContext) => {
    const url = String(samplingContext.attributes?.['http.url'] ?? '')

    if (url.includes('/api/stripe/webhook')) {
      return FULL_SAMPLE_RATE
    }

    if (url.includes('/health') || url.includes('/favicon')) {
      return DROP_SAMPLE_RATE
    }

    return DEFAULT_SAMPLE_RATE
  },
  ignoreErrors: [/Unreachable hosts/],
  beforeSend: (event) => {
    if (event.request?.data) {
      const url = event.request.url ?? ''

      if (url.includes('/stripe/webhook') || url.includes('/api/auth/')) {
        delete event.request.data
      }
    }

    if (event.request?.headers) {
      for (const header of SENSITIVE_HEADERS) {
        delete event.request.headers[header]
      }
    }

    return event
  }
})
