import { type AppErrorCode, getAppErrorCode } from '~/constants/error'
import { m } from '~/paraglide/messages.js'

const APP_ERROR_MESSAGES = {
  PREMIUM_REQUIRED: () => {
    return m.error_premium_required()
  },
  UNAUTHORIZED: () => {
    return m.error_unauthorized()
  },
  BANNED_USER: () => {
    return m.auth_error_banned_user()
  },
  RATE_LIMITED: () => {
    return m.error_rate_limited()
  },
  SUBMISSION_LIMIT_REACHED: () => {
    return m.submit_error_limit_reached()
  },
  DUPLICATE_URL: () => {
    return m.submit_error_duplicate_url()
  },
  TWEET_NO_VIDEO: () => {
    return m.submit_error_tweet_no_video()
  },
  TWEET_VERIFICATION_FAILED: () => {
    return m.submit_error_tweet_verification_failed()
  },
  AI_SEARCH_QUOTA_EXCEEDED: () => {
    return m.ai_search_upsell_title()
  },
  AI_SEARCH_UNAVAILABLE: () => {
    return m.ai_search_error_unavailable()
  }
} as const satisfies Record<AppErrorCode, () => string>

export const getErrorMessage = (error: unknown) => {
  const code = getAppErrorCode(error)

  if (code !== undefined) {
    return APP_ERROR_MESSAGES[code]()
  }

  if (error instanceof Error && error.message !== '') {
    return error.message
  }

  return m.error_title()
}

export const matchIsRateLimitError = (error: unknown) => {
  return getAppErrorCode(error) === 'RATE_LIMITED'
}
