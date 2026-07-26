import { ONE_YEAR_IN_SECONDS, SEVEN_DAYS_IN_SECONDS } from './time'

export const IMMUTABLE_CACHE_CONTROL = `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`

export const WEEKLY_CACHE_CONTROL = `public, max-age=${SEVEN_DAYS_IN_SECONDS}`
