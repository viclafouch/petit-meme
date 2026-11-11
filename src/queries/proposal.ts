import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { listUserProposals } from '~/server/proposal/proposal.functions'

export const listUserProposalsQueryOpts = () => {
  return queryOptions({
    queryKey: [...listUserProposalsQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return listUserProposals()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

listUserProposalsQueryOpts.all = ['user-proposals'] as const
