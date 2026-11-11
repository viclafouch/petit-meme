import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { MINUTE } from '~/constants/time'
import { listAdminAiSearchLogs } from '~/server/admin/ai-search/ai-search.functions'

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
