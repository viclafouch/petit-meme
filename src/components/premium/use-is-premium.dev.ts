import { useRouteContext } from '@tanstack/react-router'
import { readPremiumOverride } from '~/lib/premium-override'
import { useIsPremium as useSubscribedIsPremium } from './use-is-premium'

export const useIsPremium = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const isSubscribedPremium = useSubscribedIsPremium()
  const premiumOverride = readPremiumOverride()

  if (user && premiumOverride) {
    return premiumOverride === 'premium'
  }

  return isSubscribedPremium
}
