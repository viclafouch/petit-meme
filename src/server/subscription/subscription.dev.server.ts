import { createServerOnlyFn } from '@tanstack/react-start'
import type { SessionUser } from '~/helpers/role'
import { readPremiumOverride } from '~/lib/premium-override'
import {
  findPremiumSubscription,
  matchIsUserPremium as matchIsSubscribedUserPremium,
  PREMIUM_SUBSCRIPTION_WHERE
} from './subscription.server'

export { findPremiumSubscription, PREMIUM_SUBSCRIPTION_WHERE }

export const matchIsUserPremium = createServerOnlyFn(
  async (user: SessionUser) => {
    const premiumOverride = readPremiumOverride()

    if (premiumOverride) {
      return premiumOverride === 'premium'
    }

    return matchIsSubscribedUserPremium(user)
  }
)
