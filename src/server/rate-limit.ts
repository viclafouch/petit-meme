import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
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

  // Throw a Response, not an Error: the server-fn handler returns any thrown
  // Response verbatim (`error instanceof Response`), so this reaches the client
  // as a real 429 with Retry-After. A thrown Error escapes to the outer server
  // layer as an unhandled 500 instead.
  throw new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfterSeconds) }
  })
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
