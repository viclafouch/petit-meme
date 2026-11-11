import {
  keepPreviousData,
  type QueryClient,
  queryOptions
} from '@tanstack/react-query'
import type { ActivityFilters } from '~/constants/activity'
import type { AdminMemesFilters } from '~/constants/meme'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import type { Meme, User, Video } from '~/db/generated/prisma/client'
import type { MemeProposalStatus } from '~/db/generated/prisma/enums'
import { getMemeQueryOpts } from '~/lib/queries'
import {
  listAdminActivity,
  listAdminRecentActivity
} from '~/server/admin/activity/activity.functions'
import { getAdminMemeFill } from '~/server/admin/ai-assist/ai-assist.functions'
import { listAdminAiSearchLogs } from '~/server/admin/ai-search/ai-search.functions'
import {
  type DashboardPeriod,
  getAdminDashboardChart,
  getAdminDashboardTotals,
  listAdminRecentAudit,
  listAdminTrendingMemes
} from '~/server/admin/dashboard/dashboard.functions'
import {
  getMissingMemeFiles,
  getAdminMemeOriginal
} from '~/server/admin/meme/meme-file.functions'
import {
  getAdminMeme,
  getAdminVideoStatus,
  listAdminMemes
} from '~/server/admin/meme/meme.functions'
import {
  countAdminPendingProposals,
  listAdminProposals
} from '~/server/admin/proposal/proposal.functions'
import {
  type AdminUserActivityFilters,
  getAdminUser,
  getAdminUserSubscriptionHistory,
  listAdminUserActivity,
  listAdminUsers
} from '~/server/admin/user/user.functions'
import {
  type AdminVisitorActivityFilters,
  listAdminVisitorActivity,
  getAdminVisitor
} from '~/server/admin/visitor/visitor.functions'

const DASHBOARD_STALE_MINUTES = 10
const BACKGROUND_STALE_MINUTES = 5

export const getAdminMemeQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminMeme({ data: memeId })
    },
    staleTime: 2 * MINUTE
  })
}

getAdminMemeQueryOpts.all = ['admin-meme'] as const

export const getAdminMemeFillQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeFillQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminMemeFill({ data: memeId })
    },
    staleTime: Infinity
  })
}

getAdminMemeFillQueryOpts.all = ['admin-meme-fill'] as const

export const getAdminVideoStatusQueryOpts = (videoId: Video['id']) => {
  return queryOptions({
    queryKey: [...getAdminVideoStatusQueryOpts.all, videoId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminVideoStatus({ data: videoId })
    },
    staleTime: MINUTE
  })
}

getAdminVideoStatusQueryOpts.all = ['admin-video-status'] as const

export const listAdminMemesQueryOpts = (filters: AdminMemesFilters) => {
  return queryOptions({
    queryKey: [...listAdminMemesQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminMemes({ data: filters })
    },
    staleTime: 2 * MINUTE
  })
}

listAdminMemesQueryOpts.all = ['admin-memes-list'] as const

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

export const listAdminUsersQueryOpts = () => {
  return queryOptions({
    queryKey: [...listAdminUsersQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminUsers()
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

listAdminUsersQueryOpts.all = ['admin-users-list'] as const

export const getAdminUserQueryOpts = (userId: User['id']) => {
  return queryOptions({
    queryKey: [...getAdminUserQueryOpts.all, userId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminUser({ data: userId })
    },
    staleTime: MINUTE
  })
}

getAdminUserQueryOpts.all = ['admin-user-detail'] as const

export const getAdminUserSubscriptionHistoryQueryOpts = (
  userId: User['id']
) => {
  return queryOptions({
    queryKey: [...getAdminUserSubscriptionHistoryQueryOpts.all, userId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminUserSubscriptionHistory({ data: userId })
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

getAdminUserSubscriptionHistoryQueryOpts.all = [
  'admin-user-subscription-history'
] as const

export const listAdminUserActivityQueryOpts = (
  filters: AdminUserActivityFilters
) => {
  return queryOptions({
    queryKey: [...listAdminUserActivityQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminUserActivity({ data: filters })
    },
    placeholderData: keepPreviousData,
    staleTime: MINUTE
  })
}

listAdminUserActivityQueryOpts.all = ['admin-user-activity'] as const

export const getAdminVisitorQueryOpts = (ipAddress: string) => {
  return queryOptions({
    queryKey: [...getAdminVisitorQueryOpts.all, ipAddress],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminVisitor({ data: ipAddress })
    },
    staleTime: MINUTE
  })
}

getAdminVisitorQueryOpts.all = ['admin-visitor-detail'] as const

export const listAdminVisitorActivityQueryOpts = (
  filters: AdminVisitorActivityFilters
) => {
  return queryOptions({
    queryKey: [...listAdminVisitorActivityQueryOpts.all, filters],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminVisitorActivity({ data: filters })
    },
    placeholderData: keepPreviousData,
    staleTime: MINUTE
  })
}

listAdminVisitorActivityQueryOpts.all = ['admin-visitor-activity'] as const

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

export const listAdminProposalsQueryOpts = (
  statusFilter?: MemeProposalStatus
) => {
  return queryOptions({
    queryKey: [...listAdminProposalsQueryOpts.all, statusFilter],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminProposals({ data: statusFilter })
    },
    staleTime: 2 * MINUTE
  })
}

listAdminProposalsQueryOpts.all = ['admin-proposals'] as const

export const countAdminPendingProposalsQueryOpts = () => {
  return queryOptions({
    queryKey: [...countAdminPendingProposalsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return countAdminPendingProposals()
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

countAdminPendingProposalsQueryOpts.all = [
  'admin-pending-proposal-count'
] as const

export const getMissingMemeFilesQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getMissingMemeFilesQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getMissingMemeFiles({ data: memeId })
    },
    staleTime: BACKGROUND_STALE_MINUTES * MINUTE
  })
}

getMissingMemeFilesQueryOpts.all = ['admin-meme-files'] as const

export const getAdminMemeOriginalQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeOriginalQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: async () => {
      const response = await getAdminMemeOriginal({ data: memeId })

      return response.blob()
    },
    staleTime: Infinity
  })
}

getAdminMemeOriginalQueryOpts.all = ['admin-video-blob'] as const

export const listAdminAiSearchLogsQueryOpts = () => {
  return queryOptions({
    queryKey: [...listAdminAiSearchLogsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listAdminAiSearchLogs()
    },
    staleTime: 2 * MINUTE
  })
}

listAdminAiSearchLogsQueryOpts.all = ['admin-ai-search-logs'] as const

export const invalidateSavedMeme = (
  queryClient: QueryClient,
  memeId: Meme['id']
) => {
  queryClient.removeQueries(getMemeQueryOpts(memeId))

  return queryClient.invalidateQueries(getAdminMemeQueryOpts(memeId))
}

export const markAdminMemesOverviewStale = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: listAdminMemesQueryOpts.all,
      refetchType: 'none'
    }),
    queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all,
      refetchType: 'none'
    })
  ])
}

export const invalidateAdminMemesOverview = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: listAdminMemesQueryOpts.all
    }),
    queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all
    })
  ])
}
