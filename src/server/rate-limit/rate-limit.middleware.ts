import { createMiddleware } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import type { RateLimitConfig } from '~/constants/rate-limit'
import { extractClientIp } from '~/helpers/request'
import { logger } from '~/lib/logger'
import { captureWithFeature, wrapMiddlewareWithSentry } from '~/lib/sentry'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import { checkRateLimit } from '~/server/rate-limit/rate-limit.server'

const rateLimitLogger = logger.child({ module: 'rate-limit' })

type EnforceRateLimitParams = {
  key: string
  identifier: Record<string, unknown>
  config: RateLimitConfig
}

const enforceRateLimit = ({
  key,
  identifier,
  config
}: EnforceRateLimitParams) => {
  const result = checkRateLimit(key, config)

  if (!result.exceeded) {
    return
  }

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

  setResponseHeader('Retry-After', String(result.retryAfterSeconds))
  throwWithStatus(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    new AppError('rate_limited', { code: 'RATE_LIMITED' })
  )
}

export const createRateLimitMiddleware = (config: RateLimitConfig) => {
  const middleware = createMiddleware({ type: 'function' }).server(
    async ({ next }) => {
      const { headers } = getRequest()
      const ip = extractClientIp(headers)

      enforceRateLimit({
        key: `${config.action}:${ip}`,
        identifier: { ip, userAgent: headers.get('user-agent') ?? 'unknown' },
        config
      })

      return next()
    }
  )

  return wrapMiddlewareWithSentry(config.action, middleware)
}

export const createUserRateLimitMiddleware = (config: RateLimitConfig) => {
  const middleware = createMiddleware({ type: 'function' })
    .middleware([userRequiredMiddleware])
    .server(async ({ context, next }) => {
      const userId = context.user.id

      enforceRateLimit({
        key: `${config.action}:user:${userId}`,
        identifier: { userId },
        config
      })

      return next({ context: { user: context.user } })
    })

  return wrapMiddlewareWithSentry(`${config.action}-user`, middleware)
}
