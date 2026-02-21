import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  enabled: process.env.NODE_ENV === 'production',
  sendDefaultPii: false,
  tracesSampleRate: 0.2,
})
