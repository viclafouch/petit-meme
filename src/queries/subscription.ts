import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { getPremiumSubscription } from '~/server/subscription/subscription.functions'

export const getPremiumSubscriptionQueryOpts = () => {
  return queryOptions({
    queryKey: [...getPremiumSubscriptionQueryOpts.all],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getPremiumSubscription()
    },
    staleTime: FIVE_MINUTES_MS
  })
}

getPremiumSubscriptionQueryOpts.all = ['premium-subscription'] as const
