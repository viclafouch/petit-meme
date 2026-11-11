import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureUnexpectedAuthError } from '~/lib/auth-errors'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

describe('captureUnexpectedAuthError', () => {
  beforeEach(() => {
    vi.mocked(captureWithFeature).mockClear()
  })

  it('should not report a wrong email or password', () => {
    captureUnexpectedAuthError(
      new Error('INVALID_EMAIL_OR_PASSWORD'),
      'sign-in'
    )

    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should not report an email that already has an account', () => {
    captureUnexpectedAuthError(new Error('USER_ALREADY_EXISTS'), 'sign-up')

    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should report a failure on the auth server', () => {
    const error = new Error('FAILED_TO_CREATE_SESSION')

    captureUnexpectedAuthError(error, 'sign-in')

    expect(captureWithFeature).toHaveBeenCalledWith(error, 'sign-in')
  })

  it('should report an unknown code', () => {
    const error = new Error('UNKNOWN')

    captureUnexpectedAuthError(error, 'sign-up')

    expect(captureWithFeature).toHaveBeenCalledWith(error, 'sign-up')
  })
})
