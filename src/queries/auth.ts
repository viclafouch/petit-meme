import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { getAuthUser } from '~/server/auth/auth.functions'

export const getAuthUserQueryOpts = () => {
  return queryOptions({
    queryKey: [...getAuthUserQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAuthUser()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getAuthUserQueryOpts.all = ['auth-user'] as const
