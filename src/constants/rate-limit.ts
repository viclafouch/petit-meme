import { MINUTE } from '@/constants/time'

export type RateLimitConfig = {
  action: string
  maxRequests: number
  windowMs: number
}

export const RATE_LIMIT_DOWNLOAD = {
  action: 'download',
  maxRequests: 10,
  windowMs: 5 * MINUTE
} as const satisfies RateLimitConfig

export const RATE_LIMIT_TRACK = {
  action: 'track',
  maxRequests: 30,
  windowMs: 5 * MINUTE
} as const satisfies RateLimitConfig

export const RATE_LIMIT_LISTING = {
  action: 'listing',
  maxRequests: 60,
  windowMs: MINUTE
} as const satisfies RateLimitConfig

export const RATE_LIMIT_REELS = {
  action: 'reels',
  maxRequests: 30,
  windowMs: MINUTE
} as const satisfies RateLimitConfig

export const RATE_LIMIT_VIEW = {
  action: 'view',
  maxRequests: 60,
  windowMs: MINUTE
} as const satisfies RateLimitConfig
