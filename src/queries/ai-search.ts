import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import { getAiSearchQuota } from '~/server/ai-search/ai-search.functions'

export const getAiSearchQuotaQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAiSearchQuotaQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAiSearchQuota()
    },
    staleTime: MINUTE
  })
}

getAiSearchQuotaQueryOpts.all = ['ai-search-quota'] as const
