import { createMiddleware } from '@tanstack/react-start'
import {
  getRequest,
  setResponseHeader,
  setResponseStatus
} from '@tanstack/react-start/server'
import { RATE_LIMIT_ERROR_MESSAGE } from '~/constants/rate-limit'
import type { RateLimitConfig } from '~/constants/rate-limit'
import { extractClientIp } from '~/helpers/request'
import { logger } from '~/lib/logger'
import { captureWithFeature, wrapMiddlewareWithSentry } from '~/lib/sentry'
import { authUserRequiredMiddleware } from '~/server/user-auth'
import { checkRateLimit } from '~/utils/rate-limit-store'
import type { RateLimitCheckResult } from '~/utils/rate-limit-store'

const rateLimitLogger = logger.child({ module: 'rate-limit' })

type ThrowRateLimitExceededParams = {
  identifier: Record<string, unknown>
  config: RateLimitConfig
  result: RateLimitCheckResult
}

const throwRateLimitExceeded = ({
  identifier,
  config,
  result
}: ThrowRateLimitExceededParams): never => {
  rateLimitLogger.warn(
    { ...identifier, action: config.action, count: result.entry.count },
    'Rate limit exceeded'
  )

  captureWithFeature(
    new Error(
      `Rate limit exceeded: ${config.action} (${result.entry.count}/${config.maxRequests})`
    ),
    'scraping-detection'
  )

  // Throw an Error, never a Response. `executeMiddleware` catches every throw
  // into `{ ...ctx, error }`, and a Response there is flagged
  // `X-TSS-Raw-Response` and handed back to the client as a resolved value:
  // the mutation would succeed silently and `onError` would never fire.
  // An Error goes through the serialized envelope instead, which the client
  // chain unwraps with `if (result.error) throw result.error`.
  setResponseStatus(429)
  setResponseHeader('Retry-After', String(result.retryAfterSeconds))

  throw new Error(RATE_LIMIT_ERROR_MESSAGE)
}

export const createRateLimitMiddleware = (config: RateLimitConfig) => {
  const middleware = createMiddleware({ type: 'function' }).server(
    async ({ next }) => {
      const request = getRequest()
      const ip = extractClientIp(request.headers)
      const key = `${config.action}:${ip}`
      const result = checkRateLimit(key, config)

      if (result.exceeded) {
        const userAgent = request.headers.get('user-agent') ?? 'unknown'

        throwRateLimitExceeded({
          identifier: { ip, userAgent },
          config,
          result
        })
      }

      return next()
    }
  )

  return wrapMiddlewareWithSentry(config.action, middleware)
}

export const createUserRateLimitMiddleware = (config: RateLimitConfig) => {
  const middleware = createMiddleware({ type: 'function' })
    .middleware([authUserRequiredMiddleware])
    .server(async ({ context, next }) => {
      const userId = context.user.id
      const key = `${config.action}:user:${userId}`
      const result = checkRateLimit(key, config)

      if (result.exceeded) {
        throwRateLimitExceeded({
          identifier: { userId },
          config,
          result
        })
      }

      return next({ context: { user: context.user } })
    })

  return wrapMiddlewareWithSentry(`${config.action}-user`, middleware)
}
