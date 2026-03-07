import type { RateLimitConfig } from '@/constants/rate-limit'
import { SECOND } from '@/constants/time'
import { logger } from '@/lib/logger'
import { captureWithFeature, wrapMiddlewareWithSentry } from '@/lib/sentry'
import { createMiddleware } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'

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

export const createRateLimitMiddleware = (config: RateLimitConfig) => {
  const middleware = createMiddleware({ type: 'function' }).server(
    async ({ next }) => {
      const request = getRequest()
      const ip = extractClientIp(request)
      const key = `${config.action}:${ip}`
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
        const userAgent = request.headers.get('user-agent') ?? 'unknown'

        rateLimitLogger.warn(
          { ip, action: config.action, count: entry.count, userAgent },
          'Rate limit exceeded'
        )

        captureWithFeature(
          new Error(
            `Rate limit exceeded: ${config.action} (${entry.count}/${config.maxRequests})`
          ),
          'scraping-detection'
        )

        setResponseStatus(429)
        throw new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) }
        })
      }

      return next()
    }
  )

  return wrapMiddlewareWithSentry(config.action, middleware)
}
