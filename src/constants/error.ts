import { createSerializationAdapter } from '@tanstack/react-router'

export type StudioErrorCode =
  | 'PREMIUM_REQUIRED'
  | 'UNAUTHORIZED'
  | 'BANNED_USER'
  | 'SUBMISSION_LIMIT_REACHED'
  | 'DUPLICATE_URL'
  | 'TWEET_NO_VIDEO'
  | 'TWEET_VERIFICATION_FAILED'
  | 'AI_SEARCH_QUOTA_EXCEEDED'

export class StudioError extends Error {
  public code: StudioErrorCode

  constructor(message: string, options: { code: StudioErrorCode }) {
    super(message)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = 'StudioError'
    this.code = options.code
  }
}

export const matchIsStudioError = (error: unknown): error is StudioError => {
  return Error.isError(error) && 'code' in error
}

export const getStudioErrorCode = (
  error: unknown
): StudioErrorCode | undefined => {
  if (matchIsStudioError(error)) {
    return error.code
  }

  return Error.isError(error)
    ? (error.message.toUpperCase() as StudioErrorCode)
    : undefined
}

export const customErrorAdapter = createSerializationAdapter({
  key: 'custom-error',
  test: (value) => {
    return value instanceof StudioError
  },
  toSerializable: ({ message, code }) => {
    return {
      message,
      code
    }
  },
  fromSerializable: ({ message, code }) => {
    return new StudioError(message, { code })
  }
})
