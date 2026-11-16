import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatClockDuration, splitMinutesAndSeconds } from '~/helpers/duration'

const TWO_MINUTES_FIVE_SECONDS_AND_A_FRACTION = 125.8
const ONE_MINUTE_FIVE_SECONDS = 65
const FIVE_SECONDS = 5

describe('splitMinutesAndSeconds', () => {
  it('should split a duration into whole minutes and seconds', () => {
    expect(
      splitMinutesAndSeconds(TWO_MINUTES_FIVE_SECONDS_AND_A_FRACTION)
    ).toStrictEqual({ minutes: 2, seconds: 5 })
  })
})

describe('formatClockDuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should format a duration as minutes and two-digit seconds', () => {
    expect(formatClockDuration(ONE_MINUTE_FIVE_SECONDS, 'fr')).toBe('1:05')
    expect(formatClockDuration(FIVE_SECONDS, 'en')).toBe('0:05')
  })

  it('should keep the same clock format without Intl.DurationFormat', () => {
    vi.stubGlobal('Intl', {})

    expect(formatClockDuration(ONE_MINUTE_FIVE_SECONDS, 'fr')).toBe('1:05')
  })
})
