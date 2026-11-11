import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { getActiveSubscription } from '~/server/subscription/subscription.functions'

export const getActiveSubscriptionQueryOpts = () => {
  return queryOptions({
    queryKey: [...getActiveSubscriptionQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getActiveSubscription()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getActiveSubscriptionQueryOpts.all = ['active-subscription'] as const
