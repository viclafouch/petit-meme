import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import {
  getAdminDashboardChart,
  getAdminDashboardTotals,
  listAdminRecentAudit,
  listAdminTrendingMemes,
  type DashboardPeriod
} from '~/server/admin/dashboard/dashboard.functions'

const DASHBOARD_STALE_MINUTES = 10

export const getAdminDashboardTotalsQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminDashboardTotalsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminDashboardTotals()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminDashboardTotalsQueryOpts.all = ['admin-dashboard-totals'] as const

export const getAdminDashboardChartQueryOpts = (period: DashboardPeriod) => {
  return queryOptions({
    queryKey: [...getAdminDashboardChartQueryOpts.all, period],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminDashboardChart({ data: period })
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminDashboardChartQueryOpts.all = ['admin-chart-data'] as const

export const listAdminRecentAuditQueryOpts = () => {
  return queryOptions({
    queryKey: [...listAdminRecentAuditQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminRecentAudit()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

listAdminRecentAuditQueryOpts.all = ['admin-recent-audit'] as const

export const listAdminTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...listAdminTrendingMemesQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminTrendingMemes()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

listAdminTrendingMemesQueryOpts.all = ['admin-trending-memes'] as const
