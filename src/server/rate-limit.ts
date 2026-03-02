import type { RateLimitConfig } from '@/constants/rate-limit'
import { SECOND } from '@/constants/time'
import { prismaClient } from '@/db'
import { logger } from '@/lib/logger'
import { captureWithFeature } from '@/lib/sentry'
import { createMiddleware } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'

const rateLimitLogger = logger.child({ module: 'rate-limit' })

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
  return createMiddleware({ type: 'function' }).server(async ({ next }) => {
    const request = getRequest()
    const ip = extractClientIp(request)
    const key = `${config.action}:${ip}`
    const now = BigInt(Date.now())
    const windowCutoff = now - BigInt(config.windowMs)

    const [result] = await prismaClient.$queryRaw<
      { count: number; window_start: bigint }[]
    >`INSERT INTO "rate_limit" ("id", "key", "count", "last_request", "window_start")
      VALUES (gen_random_uuid(), ${key}, 1, ${now}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "rate_limit"."window_start" < ${windowCutoff} THEN 1
          ELSE "rate_limit"."count" + 1
        END,
        "window_start" = CASE
          WHEN "rate_limit"."window_start" < ${windowCutoff} THEN ${now}
          ELSE "rate_limit"."window_start"
        END,
        "last_request" = ${now}
      RETURNING "count", "window_start"`

    const count = result?.count ?? 0

    if (count > config.maxRequests) {
      const windowEndMs = Number(result?.window_start ?? now) + config.windowMs
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowEndMs - Date.now()) / SECOND)
      )
      const userAgent = request.headers.get('user-agent') ?? 'unknown'

      rateLimitLogger.warn(
        { ip, action: config.action, count, userAgent },
        'Rate limit exceeded'
      )

      captureWithFeature(
        new Error(
          `Rate limit exceeded: ${config.action} (${count}/${config.maxRequests})`
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
  })
}
