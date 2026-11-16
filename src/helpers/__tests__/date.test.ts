import { describe, expect, it } from 'vitest'
import { SECOND } from '~/constants/time'
import { formatRelativeTime } from '~/helpers/date'

const NOW = new Date('2026-11-16T12:00:00.000Z').getTime()
const ONE_SECOND_AHEAD = new Date(NOW + SECOND)
const THREE_SECONDS_AGO = new Date(NOW - SECOND - SECOND - SECOND)

describe('formatRelativeTime', () => {
  it('should read a date a second ahead of the clock as now', () => {
    expect(formatRelativeTime(ONE_SECOND_AHEAD, 'fr', NOW)).toBe('maintenant')
  })

  it('should read a past date relative to now', () => {
    expect(formatRelativeTime(THREE_SECONDS_AGO, 'en', NOW)).toBe(
      '3 seconds ago'
    )
  })
})
