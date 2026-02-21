import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')

export const logger = pino({
  level,
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
    'req.headers.authorization',
    'req.headers.cookie'
  ],
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: true
          }
        }
      }
    : {})
})

export const authLogger = logger.child({ module: 'auth' })
export const stripeLogger = logger.child({ module: 'stripe' })
export const emailLogger = logger.child({ module: 'email' })
export const algoliaLogger = logger.child({ module: 'algolia' })
export const bunnyLogger = logger.child({ module: 'bunny' })
export const adminLogger = logger.child({ module: 'admin' })
export const cronLogger = logger.child({ module: 'cron' })
