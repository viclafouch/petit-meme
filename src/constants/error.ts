import { createSerializationAdapter } from '@tanstack/react-router'

const STUDIO_ERROR_CODES = [
  'PREMIUM_REQUIRED',
  'UNAUTHORIZED',
  'BANNED_USER',
  'SUBMISSION_LIMIT_REACHED',
  'DUPLICATE_URL',
  'TWEET_NO_VIDEO',
  'TWEET_VERIFICATION_FAILED',
  'AI_SEARCH_QUOTA_EXCEEDED'
] as const satisfies readonly string[]

export type StudioErrorCode = (typeof STUDIO_ERROR_CODES)[number]

const matchIsStudioErrorCode = (value: string): value is StudioErrorCode => {
  return STUDIO_ERROR_CODES.some((code) => {
    return code === value
  })
}

export class StudioError extends Error {
  code: StudioErrorCode

  constructor(message: string, options: { code: StudioErrorCode }) {
    super(message)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = 'StudioError'
    this.code = options.code
  }
}

export const matchIsStudioError = (error: unknown): error is StudioError => {
  return error instanceof Error && 'code' in error
}

export const getStudioErrorCode = (
  error: unknown
): StudioErrorCode | undefined => {
  if (matchIsStudioError(error)) {
    return error.code
  }

  if (!(error instanceof Error)) {
    return undefined
  }

  const messageCode = error.message.toUpperCase()

  return matchIsStudioErrorCode(messageCode) ? messageCode : undefined
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
