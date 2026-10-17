import * as Sentry from '@sentry/tanstackstart-react'

// oxlint-disable-next-line node/no-process-env -- loaded before the app, the Sentry server setup reads the raw environment so a missing app variable never takes it down
const processEnvironment = process.env

const deploymentEnv =
  processEnvironment.VERCEL_ENV ??
  (processEnvironment.NODE_ENV === 'production' ? 'production' : 'development')

const FULL_SAMPLE_RATE = 1
const DROP_SAMPLE_RATE = 0
const DEFAULT_SAMPLE_RATE = 0.2

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie']

Sentry.init({
  dsn: processEnvironment.VITE_SENTRY_DSN,
  environment: deploymentEnv,
  enabled: deploymentEnv === 'production',
  dataCollection: {
    userInfo: false,
    httpBodies: [],
    genAI: { inputs: false, outputs: false }
  },
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
  ignoreErrors: [/Unreachable hosts/u],
  beforeSend: (event) => {
    const url = event.request?.url ?? ''
    const isSensitiveBody =
      url.includes('/stripe/webhook') || url.includes('/api/auth/')

    if (event.request && isSensitiveBody) {
      delete event.request.data
    }

    if (event.request?.headers) {
      for (const header of SENSITIVE_HEADERS) {
        Reflect.deleteProperty(event.request.headers, header)
      }
    }

    return event
  }
})
