import { DAY } from '@/constants/time'

export type ChartGranularity = 'day' | 'week' | 'month'

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

export function generateDateSeries({
  start,
  end,
  granularity
}: GenerateDateSeriesParams) {
  const series: string[] = []
  const current = new Date(truncateToGranularity(start, granularity))
  const endKey = truncateToGranularity(end, granularity)

  while (current.toISOString() <= endKey) {
    series.push(current.toISOString())

    switch (granularity) {
      case 'day': {
        current.setUTCDate(current.getUTCDate() + 1)
        break
      }

      case 'week': {
        current.setUTCDate(current.getUTCDate() + 7)
        break
      }

      default: {
        current.setUTCMonth(current.getUTCMonth() + 1)
        break
      }
    }
  }

  return series
}
