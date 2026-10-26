import { DAY, HOUR, MINUTE, FIVE_MINUTES_MS } from '~/constants/time'

export type RateLimitConfig = {
  action: string
  maxRequests: number
  windowMs: number
}

export const RATE_LIMIT_ERROR_MESSAGE = 'Too Many Requests'

export const RATE_LIMIT_DOWNLOAD = {
  action: 'download',
  maxRequests: 10,
  windowMs: FIVE_MINUTES_MS
} as const satisfies RateLimitConfig

export const RATE_LIMIT_VIEW = {
  action: 'view',
  maxRequests: 60,
  windowMs: FIVE_MINUTES_MS
} as const satisfies RateLimitConfig

export const RATE_LIMIT_TRACK = {
  action: 'track',
  maxRequests: 30,
  windowMs: FIVE_MINUTES_MS
} as const satisfies RateLimitConfig

export const RATE_LIMIT_SUBMIT_MEME = {
  action: 'submit-meme',
  maxRequests: 5,
  windowMs: DAY
} as const satisfies RateLimitConfig

export const RATE_LIMIT_VERIFICATION_EMAIL = {
  action: 'verification-email',
  maxRequests: 3,
  windowMs: HOUR
} as const satisfies RateLimitConfig

export const RATE_LIMIT_UPDATE_AVATAR = {
  action: 'update-avatar',
  maxRequests: 20,
  windowMs: HOUR
} as const satisfies RateLimitConfig

export const RATE_LIMIT_AI_SEARCH = {
  action: 'ai-search',
  maxRequests: 10,
  windowMs: MINUTE
} as const satisfies RateLimitConfig
