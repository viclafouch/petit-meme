import type { User } from 'better-auth'
import { auth } from '@/lib/auth'
import { stripeLogger } from '@/lib/logger'
import { getAuthUser } from '@/server/user-auth'
import * as Sentry from '@sentry/tanstackstart-react'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

export const findActiveSubscription = createServerOnlyFn(
  async (userId: User['id']) => {
    const { headers } = getRequest()

    try {
      const subscriptions = await auth.api.listActiveSubscriptions({
        headers,
        query: {
          referenceId: userId
        }
      })

      const activeSubscription = subscriptions.find((subscription) => {
        return (
          subscription.status === 'active' || subscription.status === 'trialing'
        )
      })

      if (!activeSubscription) {
        return null
      }

      const { limits: unusedLimits, ...rest } = activeSubscription

      return rest
    } catch (error) {
      stripeLogger.error(
        { err: error, userId },
        'Failed to list active subscriptions'
      )
      Sentry.captureException(error)

      return null
    }
  }
)

export const getActiveSubscription = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getAuthUser()

    if (!user) {
      return null
    }

    return findActiveSubscription(user.id)
  }
)

export type ActiveSubscription = NonNullable<
  Awaited<ReturnType<typeof getActiveSubscription>>
>
