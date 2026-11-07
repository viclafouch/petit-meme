import {
  DAY,
  DAYS_PER_WEEK,
  HOUR,
  MINUTE,
  MONTHS_IN_YEAR,
  ONE_YEAR_MS,
  SECOND,
  THIRTY_DAYS_MS
} from '~/constants/time'
import type { Locale } from '~/paraglide/runtime'

export type ChartGranularity = 'day' | 'week' | 'month'

const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}

export const DATE_WITH_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DEFAULT_FORMAT_OPTIONS,
  hour: '2-digit',
  minute: '2-digit'
}

const SITE_TIME_ZONE = 'Europe/Paris'

export function formatDate(
  date: Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: SITE_TIME_ZONE,
    ...(options ?? DEFAULT_FORMAT_OPTIONS)
  }).format(date)
}

const RELATIVE_TIME_THRESHOLDS = [
  { max: MINUTE, divisor: SECOND, unit: 'second' },
  { max: HOUR, divisor: MINUTE, unit: 'minute' },
  { max: DAY, divisor: HOUR, unit: 'hour' },
  { max: THIRTY_DAYS_MS, divisor: DAY, unit: 'day' },
  { max: ONE_YEAR_MS, divisor: THIRTY_DAYS_MS, unit: 'month' },
  { max: Number.POSITIVE_INFINITY, divisor: ONE_YEAR_MS, unit: 'year' }
] as const satisfies readonly {
  max: number
  divisor: number
  unit: Intl.RelativeTimeFormatUnit
}[]

export function formatRelativeTime(date: Date, locale: Locale, now: number) {
  const elapsed = date.getTime() - now
  const absoluteElapsed = Math.abs(elapsed)

  const threshold = RELATIVE_TIME_THRESHOLDS.find((entry) => {
    return absoluteElapsed < entry.max
  })

  if (!threshold) {
    return formatDate(date, locale)
  }

  const value = Math.round(elapsed / threshold.divisor)

  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    value,
    threshold.unit
  )
}

export function differenceInMonths(dateA: Date, dateB: Date) {
  return (
    (dateA.getFullYear() - dateB.getFullYear()) * MONTHS_IN_YEAR +
    dateA.getMonth() -
    dateB.getMonth()
  )
}

export function truncateToUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

export function truncateToUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function truncateToUtcWeek(date: Date) {
  const day = truncateToUtcDay(date)
  const daysSinceMonday = (day.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK

  return new Date(day.getTime() - daysSinceMonday * DAY)
}

const CHART_BUCKETS = {
  day: { startOf: truncateToUtcDay, days: 1, months: 0 },
  week: { startOf: truncateToUtcWeek, days: DAYS_PER_WEEK, months: 0 },
  month: { startOf: truncateToUtcMonth, days: 0, months: 1 }
} as const satisfies Record<
  ChartGranularity,
  { startOf: (date: Date) => Date; days: number; months: number }
>

function shiftBuckets(
  date: Date,
  granularity: ChartGranularity,
  count: number
) {
  const bucket = CHART_BUCKETS[granularity]

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + bucket.months * count,
      date.getUTCDate() + bucket.days * count
    )
  )
}

function startOfBucket(date: Date, granularity: ChartGranularity) {
  return CHART_BUCKETS[granularity].startOf(date)
}

export function truncateToGranularity(
  date: Date,
  granularity: ChartGranularity
) {
  return startOfBucket(date, granularity).toISOString()
}

export type ChartRange = {
  start: Date
  end: Date
  granularity: ChartGranularity
}

export function generateDateSeries({ start, end, granularity }: ChartRange) {
  const series: string[] = []
  const endMs = startOfBucket(end, granularity).getTime()
  let current = startOfBucket(start, granularity)

  while (current.getTime() < endMs) {
    series.push(current.toISOString())
    current = shiftBuckets(current, granularity, 1)
  }

  return series
}

type GetCompletedChartRangeParams = {
  granularity: ChartGranularity
  bucketCount: number | null
  launchDate: Date
  now: Date
}

export function getCompletedChartRange({
  granularity,
  bucketCount,
  launchDate,
  now
}: GetCompletedChartRangeParams): ChartRange {
  const end = startOfBucket(now, granularity)
  const start =
    bucketCount === null
      ? startOfBucket(launchDate, granularity)
      : shiftBuckets(end, granularity, -bucketCount)

  return { start, end, granularity }
}

export const getCurrentYear = () => {
  return new Date().getFullYear()
}
