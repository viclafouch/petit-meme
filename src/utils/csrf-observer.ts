import { createServerOnlyFn } from '@tanstack/react-start'
import { TEN_MINUTES_MS } from '~/constants/time'
import { extractClientCountry, extractClientIp } from '~/helpers/request'
import { logger } from '~/lib/logger'
import { checkRateLimit } from '~/utils/rate-limit-store.server'

const csrfLogger = logger.child({ module: 'csrf' })

const CSRF_SAMPLE_CONFIG = {
  action: 'csrf-block',
  maxRequests: 1,
  windowMs: TEN_MINUTES_MS
}

export const observeCsrfBlock = createServerOnlyFn((request: Request) => {
  const ip = extractClientIp(request.headers)
  const sample = checkRateLimit(`csrf-block:${ip}`, CSRF_SAMPLE_CONFIG)

  if (sample.exceeded) {
    return
  }

  csrfLogger.warn(
    {
      method: request.method,
      pathname: new URL(request.url).pathname,
      country: extractClientCountry(request.headers) ?? 'unknown',
      secFetchSite: request.headers.get('sec-fetch-site') ?? 'absent',
      userAgent: request.headers.get('user-agent') ?? 'unknown'
    },
    'CSRF block'
  )
})
