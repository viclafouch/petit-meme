import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_WEEKLY_BUCKETS,
  VIEW_RETENTION_DAYS
} from '~/constants/analytics'
import { DAY } from '~/constants/time'
import {
  type ChartGranularity,
  generateDateSeries,
  getCompletedChartRange
} from '~/helpers/date'

const LAUNCH_DATE = new Date('2025-01-01T00:00:00.000Z')
const SATURDAY_EVENING = new Date('2026-11-07T18:30:00.000Z')
const SUNDAY_LAST_MILLISECOND = new Date('2026-11-08T23:59:59.999Z')
const MONDAY_MIDNIGHT = new Date('2026-11-09T00:00:00.000Z')
const WEEK_DAYS = 7
const MONTH_DAYS = 30

function getSeries(
  granularity: ChartGranularity,
  bucketCount: number | null,
  now: Date
) {
  return generateDateSeries(
    getCompletedChartRange({
      granularity,
      bucketCount,
      launchDate: LAUNCH_DATE,
      now
    })
  )
}

describe('getCompletedChartRange', () => {
  it('should cover the last 7 complete days and stop before today', () => {
    const series = getSeries('day', WEEK_DAYS, SATURDAY_EVENING)

    expect(series).toStrictEqual([
      '2026-10-31T00:00:00.000Z',
      '2026-11-01T00:00:00.000Z',
      '2026-11-02T00:00:00.000Z',
      '2026-11-03T00:00:00.000Z',
      '2026-11-04T00:00:00.000Z',
      '2026-11-05T00:00:00.000Z',
      '2026-11-06T00:00:00.000Z'
    ])
  })

  it('should cover the last 30 complete days', () => {
    const series = getSeries('day', MONTH_DAYS, SATURDAY_EVENING)

    expect(series).toHaveLength(MONTH_DAYS)
    expect(series.at(0)).toBe('2026-10-08T00:00:00.000Z')
    expect(series.at(-1)).toBe('2026-11-06T00:00:00.000Z')
  })

  it('should cover the last 13 complete weeks and stop before the current one', () => {
    const series = getSeries('week', DASHBOARD_WEEKLY_BUCKETS, SATURDAY_EVENING)

    expect(series).toHaveLength(DASHBOARD_WEEKLY_BUCKETS)
    expect(series.at(0)).toBe('2026-08-03T00:00:00.000Z')
    expect(series.at(-1)).toBe('2026-10-26T00:00:00.000Z')
  })

  it('should include the week that just ended at Monday midnight', () => {
    const series = getSeries('week', DASHBOARD_WEEKLY_BUCKETS, MONDAY_MIDNIGHT)

    expect(series.at(-1)).toBe('2026-11-02T00:00:00.000Z')
  })

  it('should cover every complete month since the launch and stop before the current one', () => {
    const series = getSeries('month', null, SATURDAY_EVENING)

    expect(series.at(0)).toBe('2025-01-01T00:00:00.000Z')
    expect(series.at(-1)).toBe('2026-10-01T00:00:00.000Z')
  })

  it('should end the range at the start of the current bucket', () => {
    const range = getCompletedChartRange({
      granularity: 'day',
      bucketCount: WEEK_DAYS,
      launchDate: LAUNCH_DATE,
      now: SATURDAY_EVENING
    })

    expect(range.end.toISOString()).toBe('2026-11-07T00:00:00.000Z')
  })

  it('should count the day that just ended at midnight as complete', () => {
    const series = getSeries(
      'day',
      WEEK_DAYS,
      new Date('2026-11-07T00:00:00.000Z')
    )

    expect(series.at(-1)).toBe('2026-11-06T00:00:00.000Z')
  })
})

describe('generateDateSeries', () => {
  it('should leave out the partial bucket of an unaligned end', () => {
    const series = generateDateSeries({
      start: new Date('2026-11-04T12:00:00.000Z'),
      end: SATURDAY_EVENING,
      granularity: 'day'
    })

    expect(series).toStrictEqual([
      '2026-11-04T00:00:00.000Z',
      '2026-11-05T00:00:00.000Z',
      '2026-11-06T00:00:00.000Z'
    ])
  })
})

describe('the view retention', () => {
  it('should keep every day of the oldest dashboard week', () => {
    const range = getCompletedChartRange({
      granularity: 'week',
      bucketCount: DASHBOARD_WEEKLY_BUCKETS,
      launchDate: LAUNCH_DATE,
      now: SUNDAY_LAST_MILLISECOND
    })
    const retentionCutoff =
      SUNDAY_LAST_MILLISECOND.getTime() - VIEW_RETENTION_DAYS * DAY

    expect(range.start.getTime()).toBeGreaterThanOrEqual(retentionCutoff)
  })
})
