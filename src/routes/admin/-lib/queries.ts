import { queryOptions } from '@tanstack/react-query'
import type { MemesFilters } from '~/constants/meme'
import { MINUTE } from '~/constants/time'
import type { Meme } from '~/db/generated/prisma/client'
import type { MemeSubmissionStatus } from '~/db/generated/prisma/enums'
import { getAdminAiSearchLogs } from '~/routes/admin/-server/ai-search-logs'
import type { DashboardPeriod } from '~/routes/admin/-server/dashboard'
import {
  getAdminChartData,
  getAdminDashboardTotals,
  getAdminRecentActivity,
  getAdminTrendingMemes
} from '~/routes/admin/-server/dashboard'
import { getAdminMemeById, getAdminMemes } from '~/routes/admin/-server/memes'
import {
  getAdminPendingSubmissionCount,
  getAdminSubmissions
} from '~/routes/admin/-server/submissions'
import {
  checkMemeWatermark,
  fetchAdminVideoBlob
} from '~/routes/admin/-server/watermark'

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
    staleTime: 10 * MINUTE
  })
}

getAdminDashboardTotalsQueryOpts.all = ['admin-dashboard-totals'] as const

export const getAdminChartDataQueryOpts = (period: DashboardPeriod) => {
  return queryOptions({
    queryKey: [...getAdminChartDataQueryOpts.all, period],
    queryFn: () => {
      return getAdminChartData({ data: period })
    },
    staleTime: 10 * MINUTE
  })
}

getAdminChartDataQueryOpts.all = ['admin-chart-data'] as const

export const getAdminRecentActivityQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminRecentActivityQueryOpts.all],
    queryFn: () => {
      return getAdminRecentActivity()
    },
    staleTime: 10 * MINUTE
  })
}

getAdminRecentActivityQueryOpts.all = ['admin-recent-activity'] as const

export const getAdminTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminTrendingMemesQueryOpts.all],
    queryFn: () => {
      return getAdminTrendingMemes()
    },
    staleTime: 10 * MINUTE
  })
}

getAdminTrendingMemesQueryOpts.all = ['admin-trending-memes'] as const

export const getAdminSubmissionsQueryOpts = (
  statusFilter?: MemeSubmissionStatus
) => {
  return queryOptions({
    queryKey: [...getAdminSubmissionsQueryOpts.all, statusFilter],
    queryFn: () => {
      return getAdminSubmissions({ data: statusFilter })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminSubmissionsQueryOpts.all = ['admin-submissions'] as const

export const getAdminPendingSubmissionCountQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminPendingSubmissionCountQueryOpts.all],
    queryFn: () => {
      return getAdminPendingSubmissionCount()
    },
    staleTime: 5 * MINUTE
  })
}

getAdminPendingSubmissionCountQueryOpts.all = [
  'admin-pending-submission-count'
] as const

export const getAdminMemeWatermarkQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeWatermarkQueryOpts.all, memeId],
    queryFn: () => {
      return checkMemeWatermark({ data: memeId })
    },
    staleTime: 5 * MINUTE
  })
}

getAdminMemeWatermarkQueryOpts.all = ['admin-meme-watermark'] as const

export const getAdminVideoBlobQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminVideoBlobQueryOpts.all, memeId],
    queryFn: async () => {
      const response = await fetchAdminVideoBlob({ data: memeId })

      return response.blob()
    },
    staleTime: Infinity
  })
}

getAdminVideoBlobQueryOpts.all = ['admin-video-blob'] as const

export const getAdminAiSearchLogsQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminAiSearchLogsQueryOpts.all],
    queryFn: () => {
      return getAdminAiSearchLogs()
    },
    staleTime: 2 * MINUTE
  })
}

getAdminAiSearchLogsQueryOpts.all = ['admin-ai-search-logs'] as const
