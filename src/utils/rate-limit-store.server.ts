import type { RateLimitConfig } from '~/constants/rate-limit'
import { SECOND } from '~/constants/time'

type RateLimitEntry = {
  count: number
  windowStart: number
}

const MAX_STORE_SIZE = 10_000
const MIN_RETRY_AFTER_SECONDS = 1

const store = new Map<string, RateLimitEntry>()

const evictOldestKeys = () => {
  if (store.size <= MAX_STORE_SIZE) {
    return
  }

  const oldestKeys = [...store.keys()].slice(0, store.size - MAX_STORE_SIZE)

  for (const key of oldestKeys) {
    store.delete(key)
  }
}

export type RateLimitCheckResult = {
  exceeded: boolean
  retryAfterSeconds: number
  entry: RateLimitEntry
}

export const checkRateLimit = (
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
  evictOldestKeys()

  if (entry.count > config.maxRequests) {
    const windowEndMs = entry.windowStart + config.windowMs
    const secondsUntilWindowEnds = Math.ceil((windowEndMs - now) / SECOND)
    const retryAfterSeconds = Math.max(
      MIN_RETRY_AFTER_SECONDS,
      secondsUntilWindowEnds
    )

    return { exceeded: true, retryAfterSeconds, entry }
  }

  return { exceeded: false, retryAfterSeconds: 0, entry }
}
