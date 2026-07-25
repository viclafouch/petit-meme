import { MINUTE } from '~/constants/time'
import { extractClientCountry, extractClientIp } from '~/helpers/request'
import { captureWithFeature } from '~/lib/sentry'
import { checkRateLimit } from '~/utils/rate-limit-store'

const CSRF_SAMPLE_CONFIG = {
  action: 'csrf-block',
  maxRequests: 1,
  windowMs: 10 * MINUTE
}

export const observeCsrfBlock = (request: Request) => {
  const ip = extractClientIp(request.headers)
  const sample = checkRateLimit(`csrf-block:${ip}`, CSRF_SAMPLE_CONFIG)

  if (sample.exceeded) {
    return
  }

  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const secFetchSite = request.headers.get('sec-fetch-site') ?? 'absent'
  const country = extractClientCountry(request.headers) ?? 'unknown'

  captureWithFeature(
    new Error(
      `CSRF block: ${request.method} ${url.pathname} — ip=${ip} country=${country} sec-fetch-site=${secFetchSite} ua=${userAgent}`
    ),
    'scraping-detection'
  )
}
