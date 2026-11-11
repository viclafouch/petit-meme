import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import type { MemeProposalStatus } from '~/db/generated/prisma/enums'
import {
  countAdminPendingProposals,
  listAdminProposals
} from '~/server/admin/proposal/proposal.functions'

const BACKGROUND_STALE_MINUTES = 5

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
