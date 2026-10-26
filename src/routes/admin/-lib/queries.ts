import {
  keepPreviousData,
  type QueryClient,
  queryOptions
} from '@tanstack/react-query'
import type { ActivityFilters } from '~/constants/activity'
import type { MemesFilters } from '~/constants/meme'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import type { Meme, User } from '~/db/generated/prisma/client'
import type { MemeSubmissionStatus } from '~/db/generated/prisma/enums'
import {
  getAdminActivity,
  getAdminRecentActivityEvents
} from '~/routes/admin/-server/activity'
import { getAdminAiSearchLogs } from '~/routes/admin/-server/ai-search-logs'
import {
  type DashboardPeriod,
  getAdminChartData,
  getAdminDashboardTotals,
  getAdminRecentAudit,
  getAdminTrendingMemes
} from '~/routes/admin/-server/dashboard'
import { getAdminMemeById, getAdminMemes } from '~/routes/admin/-server/memes'
import {
  getAdminPendingSubmissionCount,
  getAdminSubmissions
} from '~/routes/admin/-server/submissions'
import {
  type AdminUserActivityFilters,
  getAdminUserActivity,
  getAdminUserDetail
} from '~/routes/admin/-server/user-detail'
import { getListUsers } from '~/routes/admin/-server/users'
import {
  type AdminVisitorActivityFilters,
  getAdminVisitorActivity,
  getAdminVisitorDetail
} from '~/routes/admin/-server/visitor'
import {
  checkMemeWatermark,
  fetchAdminVideoBlob
} from '~/routes/admin/-server/watermark'

const DASHBOARD_STALE_MINUTES = 10
const BACKGROUND_STALE_MINUTES = 5

export const getAdminMemeByIdQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeByIdQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
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
    meta: PRIVATE_QUERY_META,
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
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminDashboardTotals()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminDashboardTotalsQueryOpts.all = ['admin-dashboard-totals'] as const

export const getAdminChartDataQueryOpts = (period: DashboardPeriod) => {
  return queryOptions({
    queryKey: [...getAdminChartDataQueryOpts.all, period],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminChartData({ data: period })
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminChartDataQueryOpts.all = ['admin-chart-data'] as const

export const getAdminRecentAuditQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminRecentAuditQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminRecentAudit()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminRecentAuditQueryOpts.all = ['admin-recent-audit'] as const

export const getAdminActivityQueryOpts = (filters: ActivityFilters) => {
  return queryOptions({
    queryKey: [...getAdminActivityQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminActivity({ data: filters })
    },
    placeholderData: keepPreviousData,
    staleTime: MINUTE
  })
}

getAdminActivityQueryOpts.all = ['admin-activity'] as const

export const getAdminRecentActivityEventsQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminRecentActivityEventsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminRecentActivityEvents()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminRecentActivityEventsQueryOpts.all = [
  'admin-recent-activity-events'
] as const

export const getAdminUsersListQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminUsersListQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getListUsers()
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

getAdminUsersListQueryOpts.all = ['admin-users-list'] as const

export const getAdminUserDetailQueryOpts = (userId: User['id']) => {
  return queryOptions({
    queryKey: [...getAdminUserDetailQueryOpts.all, userId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminUserDetail({ data: userId })
    },
    staleTime: MINUTE
  })
}

getAdminUserDetailQueryOpts.all = ['admin-user-detail'] as const

export const getAdminUserActivityQueryOpts = (
  filters: AdminUserActivityFilters
) => {
  return queryOptions({
    queryKey: [...getAdminUserActivityQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminUserActivity({ data: filters })
    },
    placeholderData: keepPreviousData,
    staleTime: MINUTE
  })
}

getAdminUserActivityQueryOpts.all = ['admin-user-activity'] as const

export const getAdminVisitorDetailQueryOpts = (ipAddress: string) => {
  return queryOptions({
    queryKey: [...getAdminVisitorDetailQueryOpts.all, ipAddress],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminVisitorDetail({ data: ipAddress })
    },
    staleTime: MINUTE
  })
}

getAdminVisitorDetailQueryOpts.all = ['admin-visitor-detail'] as const

export const getAdminVisitorActivityQueryOpts = (
  filters: AdminVisitorActivityFilters
) => {
  return queryOptions({
    queryKey: [...getAdminVisitorActivityQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminVisitorActivity({ data: filters })
    },
    placeholderData: keepPreviousData,
    staleTime: MINUTE
  })
}

getAdminVisitorActivityQueryOpts.all = ['admin-visitor-activity'] as const

export const getAdminTrendingMemesQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAdminTrendingMemesQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminTrendingMemes()
    },
    staleTime: DASHBOARD_STALE_MINUTES * MINUTE
  })
}

getAdminTrendingMemesQueryOpts.all = ['admin-trending-memes'] as const

export const getAdminSubmissionsQueryOpts = (
  statusFilter?: MemeSubmissionStatus
) => {
  return queryOptions({
    queryKey: [...getAdminSubmissionsQueryOpts.all, statusFilter],
    meta: PRIVATE_QUERY_META,
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
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminPendingSubmissionCount()
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

getAdminPendingSubmissionCountQueryOpts.all = [
  'admin-pending-submission-count'
] as const

export const getAdminMemeWatermarkQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeWatermarkQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return checkMemeWatermark({ data: memeId })
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

getAdminMemeWatermarkQueryOpts.all = ['admin-meme-watermark'] as const

export const getAdminVideoBlobQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminVideoBlobQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
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
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminAiSearchLogs()
    },
    staleTime: 2 * MINUTE
  })
}

getAdminAiSearchLogsQueryOpts.all = ['admin-ai-search-logs'] as const

export const invalidateAdminMemesOverview = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getAdminMemesListQueryOpts.all
    }),
    queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all
    })
  ])
}
