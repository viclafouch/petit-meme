import type { User } from 'better-auth'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import {
  matchIsPremiumGranted,
  matchIsUserAdmin,
  type SessionUser
} from '~/helpers/role'
import { matchIsActiveSubscriptionStatus } from '~/helpers/subscription'
import { auth } from '~/server/auth/auth.server'

export const findActiveSubscription = createServerOnlyFn(
  async (userId: User['id']) => {
    const subscriptions = await auth.api.listActiveSubscriptions({
      headers: getRequest().headers,
      query: {
        referenceId: userId
      }
    })

    const activeSubscription = subscriptions.find((subscription) => {
      return matchIsActiveSubscriptionStatus(subscription.status)
    })

    if (!activeSubscription) {
      return null
    }

    const { limits: unusedLimits, ...rest } = activeSubscription

    return rest
  }
)

export const matchIsUserPremium = createServerOnlyFn(
  async (user: SessionUser) => {
    if (matchIsUserAdmin(user) || matchIsPremiumGranted(user)) {
      return true
    }

    return Boolean(await findActiveSubscription(user.id))
  }
)
