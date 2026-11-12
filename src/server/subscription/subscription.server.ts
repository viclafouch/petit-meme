import type { User } from 'better-auth'
import { createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import {
  matchIsPremiumGranted,
  matchIsUserAdmin,
  type SessionUser
} from '~/helpers/role'
import { PREMIUM_SUBSCRIPTION_STATUSES } from '~/helpers/subscription'

export const PREMIUM_SUBSCRIPTION_WHERE = {
  status: { in: [...PREMIUM_SUBSCRIPTION_STATUSES] }
} as const satisfies Prisma.SubscriptionWhereInput

export const findPremiumSubscription = createServerOnlyFn(
  async (userId: User['id']) => {
    return prismaClient.subscription.findFirst({
      where: { ...PREMIUM_SUBSCRIPTION_WHERE, referenceId: userId },
      orderBy: { periodEnd: 'desc' },
      select: {
        status: true,
        billingInterval: true,
        periodEnd: true,
        cancelAt: true,
        cancelAtPeriodEnd: true,
        endedAt: true
      }
    })
  }
)

export const matchIsUserPremium = createServerOnlyFn(
  async (user: SessionUser) => {
    if (matchIsUserAdmin(user) || matchIsPremiumGranted(user)) {
      return true
    }

    return Boolean(await findPremiumSubscription(user.id))
  }
)
