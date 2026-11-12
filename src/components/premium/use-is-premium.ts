import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { matchIsPremium } from '~/helpers/role'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'

export const useIsPremium = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const premiumSubscriptionQuery = useQuery({
    ...getPremiumSubscriptionQueryOpts(),
    enabled: Boolean(user)
  })

  return matchIsPremium({ user, subscription: premiumSubscriptionQuery.data })
}
