import { describe, expect, it } from 'vitest'
import { AppError } from '~/constants/error'
import { dropExpectedError } from '~/lib/expected-error'

const EVENT = { event_id: 'event-1' }

describe('dropExpectedError', () => {
  it('should drop the event of an AppError', () => {
    const originalException = new AppError('banned_user', {
      code: 'BANNED_USER'
    })

    expect(dropExpectedError(EVENT, { originalException })).toBeNull()
  })

  it('should keep the event of an unexpected error', () => {
    const originalException = new Error('Connection reset')

    expect(dropExpectedError(EVENT, { originalException })).toBe(EVENT)
  })

  it('should keep an event that carries no exception', () => {
    expect(dropExpectedError(EVENT, {})).toBe(EVENT)
  })
})
