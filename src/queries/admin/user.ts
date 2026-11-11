import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import type { User } from '~/db/generated/prisma/client'
import {
  getAdminUser,
  getAdminUserSubscriptionHistory,
  listAdminUserActivity,
  listAdminUsers,
  type AdminUserActivityFilters
} from '~/server/admin/user/user.functions'

const BACKGROUND_STALE_MINUTES = 5

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
