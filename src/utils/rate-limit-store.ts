import type { RateLimitConfig } from '~/constants/rate-limit'
import { SECOND } from '~/constants/time'

// One counter per rate-limit key (e.g. `download:1.2.3.4`).
// `windowStart` is the timestamp of the first request in the current window;
// `count` is how many requests landed since then.
type RateLimitEntry = {
  count: number
  windowStart: number
}

// The store lives in the memory of a single serverless instance. It is not
// shared across instances, so this is a soft cap, not a hard guarantee.
// This ceiling stops the Map from growing without bound if many distinct IPs
// hit the site (each new key adds an entry).
const MAX_STORE_SIZE = 10_000

const store = new Map<string, RateLimitEntry>()

// Called after every insert. Map preserves insertion order, so the oldest keys
// come first: when we overflow, we drop the oldest ones. It is approximate
// (an old-but-active key can be evicted), which is fine for a soft limit.
const pruneStore = () => {
  if (store.size <= MAX_STORE_SIZE) {
    return
  }

  const keysToDelete = [...store.keys()].slice(0, store.size - MAX_STORE_SIZE)

  for (const key of keysToDelete) {
    store.delete(key)
  }
}

export type RateLimitCheckResult = {
  exceeded: boolean
  // Seconds the caller should wait before retrying (0 when not exceeded).
  retryAfterSeconds: number
  entry: RateLimitEntry
}

// Fixed-window counter. Records one request for `key` and reports whether the
// caller has gone over `config.maxRequests` within `config.windowMs`.
//
// The window is "fixed": the first request of a window starts the clock, and
// the counter resets only once that whole window has elapsed (not a rolling
// window). Simpler and cheaper than a sliding window, at the cost of allowing
// a burst around the boundary between two windows.
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
  pruneStore()

  if (entry.count > config.maxRequests) {
    // Time left until the current window closes, floored at 1 second so the
    // caller never gets a "retry in 0s" answer.
    const windowEndMs = entry.windowStart + config.windowMs
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowEndMs - now) / SECOND)
    )

    return { exceeded: true, retryAfterSeconds, entry }
  }

  return { exceeded: false, retryAfterSeconds: 0, entry }
}
