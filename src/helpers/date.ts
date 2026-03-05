import { DAY, HOUR, MINUTE, SECOND } from '@/constants/time'
import type { Locale } from '@/paraglide/runtime'

export type ChartGranularity = 'day' | 'week' | 'month'

type FormatDateParams = {
  date: Date
  locale: Locale
  includeTime?: boolean
}

export function formatDate({ date, locale, includeTime }: FormatDateParams) {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }

  return new Intl.DateTimeFormat(locale, options).format(date)
}

const RELATIVE_TIME_THRESHOLDS = [
  { max: MINUTE, divisor: SECOND, unit: 'second' },
  { max: HOUR, divisor: MINUTE, unit: 'minute' },
  { max: DAY, divisor: HOUR, unit: 'hour' },
  { max: 30 * DAY, divisor: DAY, unit: 'day' },
  { max: 365 * DAY, divisor: 30 * DAY, unit: 'month' },
  { max: Number.POSITIVE_INFINITY, divisor: 365 * DAY, unit: 'year' }
] as const satisfies readonly {
  max: number
  divisor: number
  unit: Intl.RelativeTimeFormatUnit
}[]

export function formatRelativeTime(date: Date, locale: Locale) {
  const elapsed = date.getTime() - Date.now()
  const absoluteElapsed = Math.abs(elapsed)

  const threshold = RELATIVE_TIME_THRESHOLDS.find((entry) => {
    return absoluteElapsed < entry.max
  })

  if (!threshold) {
    return formatDate({ date, locale })
  }

  const value = Math.round(elapsed / threshold.divisor)

  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    value,
    threshold.unit
  )
}

export function differenceInMonths(dateA: Date, dateB: Date) {
  return (
    (dateA.getFullYear() - dateB.getFullYear()) * 12 +
    dateA.getMonth() -
    dateB.getMonth()
  )
}

export function truncateToUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

export function computeDateRanges(days: number) {
  const now = new Date()
  const currentStart = new Date(now.getTime() - days * DAY)
  const previousStart = new Date(currentStart.getTime() - days * DAY)

  return { now, currentStart, previousStart }
}

export function getChartGranularity(days: number | null): ChartGranularity {
  if (days === null) {
    return 'month'
  }

  if (days <= 30) {
    return 'day'
  }

  return 'week'
}

function formatUtcDateKey(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')

  return `${year}-${mm}-${dd}T00:00:00.000Z`
}

export function truncateToGranularity(
  date: Date,
  granularity: ChartGranularity
) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  switch (granularity) {
    case 'day': {
      return formatUtcDateKey(year, month + 1, day)
    }

    case 'week': {
      const utcDate = new Date(Date.UTC(year, month, day))
      const dayOfWeek = utcDate.getUTCDay()
      const monday = new Date(utcDate.getTime() - ((dayOfWeek + 6) % 7) * DAY)

      return formatUtcDateKey(
        monday.getUTCFullYear(),
        monday.getUTCMonth() + 1,
        monday.getUTCDate()
      )
    }

    default: {
      return formatUtcDateKey(year, month + 1, 1)
    }
  }
}

type GenerateDateSeriesParams = {
  start: Date
  end: Date
  granularity: ChartGranularity
}

function advanceDate(timestamp: number, granularity: ChartGranularity) {
  const date = new Date(timestamp)

  switch (granularity) {
    case 'day': {
      return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1
      )
    }

    case 'week': {
      return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 7
      )
    }

    default: {
      return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate()
      )
    }
  }
}

export function generateDateSeries({
  start,
  end,
  granularity
}: GenerateDateSeriesParams) {
  const series: string[] = []
  const endKey = truncateToGranularity(end, granularity)
  let currentMs = new Date(truncateToGranularity(start, granularity)).getTime()
  const endMs = new Date(endKey).getTime()

  while (currentMs <= endMs) {
    series.push(new Date(currentMs).toISOString())
    currentMs = advanceDate(currentMs, granularity)
  }

  return series
}
