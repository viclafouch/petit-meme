import type { MemesFilters } from '@/constants/meme'
import { MINUTE } from '@/constants/time'
import type { Meme } from '@/db/generated/prisma/client'
import type { DashboardPeriod } from '@admin/-server/dashboard'
import {
  getAdminChartData,
  getAdminDashboardTotals,
  getAdminRecentActivity,
  getAdminTrendingMemes
} from '@admin/-server/dashboard'
import { getAdminMemeById, getAdminMemes } from '@admin/-server/memes'
import { queryOptions } from '@tanstack/react-query'

export const getAdminMemeByIdQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeByIdQueryOpts.all, memeId],
    queryFn: () => {
      return getAdminMemeById({ data: memeId })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminMemeByIdQueryOpts.all = ['admin-meme'] as const

export const getAdminMemesListQueryOpts = (filters: MemesFilters) => {
  return queryOptions({
    queryKey: [...getAdminMemesListQueryOpts.all, filters],
    queryFn: () => {
      return getAdminMemes({ data: filters })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminMemesListQueryOpts.all = ['admin-memes-list'] as const

export const getAdminDashboardTotalsQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminDashboardTotalsQueryOpts.all],
    queryFn: () => {
      return getAdminDashboardTotals()
    },
    refetchInterval: MINUTE
  })
}

getAdminDashboardTotalsQueryOpts.all = ['admin-dashboard-totals'] as const

export const getAdminChartDataQueryOpts = (period: DashboardPeriod) => {
  return queryOptions({
    queryKey: [...getAdminChartDataQueryOpts.all, period],
    queryFn: () => {
      return getAdminChartData({ data: period })
    },
    refetchInterval: MINUTE
  })
}

getAdminChartDataQueryOpts.all = ['admin-chart-data'] as const

export const getAdminRecentActivityQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminRecentActivityQueryOpts.all],
    queryFn: () => {
      return getAdminRecentActivity()
    },
    refetchInterval: MINUTE
  })
}

getAdminRecentActivityQueryOpts.all = ['admin-recent-activity'] as const

export const getAdminTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminTrendingMemesQueryOpts.all],
    queryFn: () => {
      return getAdminTrendingMemes()
    }
  })
}

getAdminTrendingMemesQueryOpts.all = ['admin-trending-memes'] as const
