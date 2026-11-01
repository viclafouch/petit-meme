export type AppErrorCode =
  | 'PREMIUM_REQUIRED'
  | 'UNAUTHORIZED'
  | 'BANNED_USER'
  | 'RATE_LIMITED'
  | 'SUBMISSION_LIMIT_REACHED'
  | 'DUPLICATE_URL'
  | 'TWEET_NO_VIDEO'
  | 'TWEET_VERIFICATION_FAILED'
  | 'AI_SEARCH_QUOTA_EXCEEDED'
  | 'AI_SEARCH_UNAVAILABLE'

export class AppError extends Error {
  code: AppErrorCode

  constructor(message: string, options: { code: AppErrorCode }) {
    super(message)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = 'AppError'
    this.code = options.code
  }
}

export const getAppErrorCode = (error: unknown) => {
  return error instanceof AppError ? error.code : undefined
}
