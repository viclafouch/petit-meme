import { describe, expect, it } from 'vitest'
import { AppError, getAppErrorCode } from '~/constants/error'

describe('getAppErrorCode', () => {
  it('should read the code of an AppError', () => {
    const error = new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })

    expect(getAppErrorCode(error)).toBe('PREMIUM_REQUIRED')
  })

  it('should ignore the code an unrelated error carries', () => {
    const error = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002'
    })

    expect(getAppErrorCode(error)).toBeUndefined()
  })

  it('should ignore an error whose message spells a known code', () => {
    const error = new Error('unauthorized')

    expect(getAppErrorCode(error)).toBeUndefined()
  })

  it('should ignore a value that is not an error', () => {
    expect(getAppErrorCode('PREMIUM_REQUIRED')).toBeUndefined()
  })
})
