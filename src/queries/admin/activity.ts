import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { ActivityFilters } from '~/constants/activity'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import {
  listAdminActivity,
  listAdminRecentActivity
} from '~/server/admin/activity/activity.functions'

const DASHBOARD_STALE_MINUTES = 10

export const listAdminActivityQueryOpts = (filters: ActivityFilters) => {
  return queryOptions({
    queryKey: [...listAdminActivityQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminActivity({ data: filters })
    },
    placeholderData: keepPreviousData,
    staleTime: MINUTE
  })
}

listAdminActivityQueryOpts.all = ['admin-activity'] as const

export const listAdminRecentActivityQueryOpts = () => {
  return queryOptions({
    queryKey: [...listAdminRecentActivityQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminRecentActivity()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

listAdminRecentActivityQueryOpts.all = ['admin-recent-activity-events'] as const
