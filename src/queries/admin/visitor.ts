import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import {
  getAdminVisitor,
  listAdminVisitorActivity,
  type AdminVisitorActivityFilters
} from '~/server/admin/visitor/visitor.functions'

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
