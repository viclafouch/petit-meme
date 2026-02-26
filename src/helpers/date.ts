import { DAY } from '@/constants/time'

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
