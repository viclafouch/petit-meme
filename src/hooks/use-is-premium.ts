import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { getActiveSubscriptionQueryOpts } from '~/lib/queries'
import { matchIsPremium } from '~/lib/role'

export const useIsPremium = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const activeSubscriptionQuery = useQuery({
    ...getActiveSubscriptionQueryOpts(),
    enabled: Boolean(user)
  })

  return matchIsPremium({ user, subscription: activeSubscriptionQuery.data })
}
