import { DAYS_PER_WEEK } from '~/constants/time'

export const DASHBOARD_WEEKLY_BUCKETS = 13

export const VIEW_RETENTION_DAYS =
  (DASHBOARD_WEEKLY_BUCKETS + 1) * DAYS_PER_WEEK
