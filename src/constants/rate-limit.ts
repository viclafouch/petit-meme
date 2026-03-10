import { DAY, MINUTE } from '@/constants/time'

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

export const RATE_LIMIT_SUBMIT_MEME = {
  action: 'submit-meme',
  maxRequests: 5,
  windowMs: DAY
} as const satisfies RateLimitConfig
