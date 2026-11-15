import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatClockDuration,
  formatSeconds,
  splitMinutesAndSeconds
} from '~/helpers/duration'

const TWO_MINUTES_FIVE_SECONDS_AND_A_FRACTION = 125.8
const ONE_MINUTE_FIVE_SECONDS = 65
const FIVE_SECONDS = 5
const TWELVE_SECONDS = 12

describe('splitMinutesAndSeconds', () => {
  it('should split a duration into whole minutes and seconds', () => {
    expect(
      splitMinutesAndSeconds(TWO_MINUTES_FIVE_SECONDS_AND_A_FRACTION)
    ).toStrictEqual({ minutes: 2, seconds: 5 })
  })
})

describe('formatSeconds', () => {
  it('should format seconds with the short unit of each locale', () => {
    expect(formatSeconds(TWELVE_SECONDS, 'en')).toBe('12 sec')
    expect(formatSeconds(TWELVE_SECONDS, 'fr')).toBe('12\u202Fs')
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
