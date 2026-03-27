import { createMiddleware } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import type { RateLimitConfig } from '~/constants/rate-limit'
import { SECOND } from '~/constants/time'
import { logger } from '~/lib/logger'
import { captureWithFeature, wrapMiddlewareWithSentry } from '~/lib/sentry'
import { authUserRequiredMiddleware } from '~/server/user-auth'

const rateLimitLogger = logger.child({ module: 'rate-limit' })

type RateLimitEntry = {
  count: number
  windowStart: number
}

const MAX_STORE_SIZE = 10_000

const store = new Map<string, RateLimitEntry>()

const pruneStore = () => {
  if (store.size <= MAX_STORE_SIZE) {
    return
  }

  const keysToDelete = [...store.keys()].slice(0, store.size - MAX_STORE_SIZE)

  for (const key of keysToDelete) {
    store.delete(key)
  }
}

export const extractClientIp = (request: Request) => {
  const realIp = request.headers.get('x-real-ip')

  if (realIp) {
    return realIp.trim()
  }

  const forwarded = request.headers.get('x-forwarded-for')

  if (forwarded) {
    const ips = forwarded.split(',')

    return ips.at(-1)?.trim() ?? 'unknown'
  }

  return 'unknown'
}

type RateLimitCheckResult = {
  exceeded: boolean
  retryAfterSeconds: number
  entry: RateLimitEntry
}

const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitCheckResult => {
  const now = Date.now()
  const existing = store.get(key)

  const isWindowExpired =
    !existing || existing.windowStart < now - config.windowMs
  const entry: RateLimitEntry = isWindowExpired
    ? { count: 1, windowStart: now }
    : { count: existing.count + 1, windowStart: existing.windowStart }

  store.set(key, entry)
  pruneStore()

  if (entry.count > config.maxRequests) {
    const windowEndMs = entry.windowStart + config.windowMs
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowEndMs - now) / SECOND)
    )

    return { exceeded: true, retryAfterSeconds, entry }
  }

  return { exceeded: false, retryAfterSeconds: 0, entry }
}

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

  setResponseStatus(429)
  throw new Error('Too Many Requests')
}

export const createRateLimitMiddleware = (config: RateLimitConfig) => {
  const middleware = createMiddleware({ type: 'function' }).server(
    async ({ next }) => {
      const request = getRequest()
      const ip = extractClientIp(request)
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
