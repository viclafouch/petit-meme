import pino, { type TransportSingleOptions } from 'pino'
import { createIsomorphicFn } from '@tanstack/react-start'
import { IS_PRODUCTION } from '~/constants/env'
import { baseEnv } from '~/env/base.server'

const DEFAULT_LEVEL = IS_PRODUCTION ? 'info' : 'debug'

const resolveLogLevel = createIsomorphicFn()
  .server(() => {
    return baseEnv.LOG_LEVEL ?? DEFAULT_LEVEL
  })
  .client(() => {
    return DEFAULT_LEVEL
  })

const level = resolveLogLevel()

const prettyTransport = {
  caller: import.meta.url,
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:HH:MM:ss.l',
    ignore: 'pid,hostname',
    singleLine: true
  }
} satisfies TransportSingleOptions & { caller: string }

export const logger = pino({
  level,
  errorKey: 'error',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    }
  },
  redact: [
    'password',
    'token',
    'secret',
    'apiKey',
    'email',
    '*.email',
    'to',
    '*.to',
    'req.headers.authorization',
    'req.headers.cookie'
  ],
  ...(!IS_PRODUCTION ? { transport: prettyTransport } : {})
})

export const authLogger = logger.child({ module: 'auth' })
export const stripeLogger = logger.child({ module: 'stripe' })
export const emailLogger = logger.child({ module: 'email' })
export const algoliaLogger = logger.child({ module: 'algolia' })
export const bunnyLogger = logger.child({ module: 'bunny' })
export const adminLogger = logger.child({ module: 'admin' })
export const cronLogger = logger.child({ module: 'cron' })
export const submissionLogger = logger.child({ module: 'submission' })
export const aiSearchLogger = logger.child({ module: 'ai-search' })
