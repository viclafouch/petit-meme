import { createSerializationAdapter } from '@tanstack/react-router'

export type StudioErrorCode = 'PREMIUM_REQUIRED' | 'UNAUTHORIZED'

export class StudioError extends Error {
  public code: StudioErrorCode

  constructor(message: string, options: { code: StudioErrorCode }) {
    super(message)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = this.constructor.name
    this.code = options.code
  }
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
