import * as Sentry from '@sentry/tanstackstart-react'

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie']

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  enabled: process.env.NODE_ENV === 'production',
  sendDefaultPii: false,
  tracesSampler(samplingContext) {
    const url = samplingContext.attributes?.['http.url'] ?? ''

    if (url.includes('/api/stripe/webhook')) {
      return 1.0
    }

    if (url.includes('/health') || url.includes('/favicon')) {
      return 0
    }

    return 0.2
  },
  beforeSend(event) {
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
  },
})
