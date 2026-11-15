import { SECONDS_PER_MINUTE } from '~/constants/time'

type MinutesAndSeconds = {
  minutes: number
  seconds: number
}

export const splitMinutesAndSeconds = (
  totalSeconds: number
): MinutesAndSeconds => {
  return {
    minutes: Math.floor(totalSeconds / SECONDS_PER_MINUTE),
    seconds: Math.floor(totalSeconds % SECONDS_PER_MINUTE)
  }
}

export const formatSeconds = (seconds: number, locale: string) => {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'short'
  }).format(seconds)
}

export const formatClockDuration = (totalSeconds: number, locale: string) => {
  const duration = splitMinutesAndSeconds(totalSeconds)

  if ('DurationFormat' in Intl) {
    return new Intl.DurationFormat(locale, {
      minutes: 'numeric',
      seconds: '2-digit'
    }).format(duration)
  }

  return `${duration.minutes}:${String(duration.seconds).padStart(2, '0')}`
}
