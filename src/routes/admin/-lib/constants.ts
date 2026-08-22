import type { PaginationState } from '@tanstack/react-table'

export const DASHBOARD_FEED_SIZE = 10

export const PAGE_SIZE = 20

export const INITIAL_PAGINATION = {
  pageIndex: 0,
  pageSize: PAGE_SIZE
} as const satisfies PaginationState
