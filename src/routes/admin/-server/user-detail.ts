import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  ACTIVITY_PAGE_SCHEMA,
  ACTIVITY_RETENTION_DAYS
} from '~/constants/activity'
import { DAY } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { buildSubscriptionInfo } from '~/routes/admin/-lib/premium'
import { buildSubscriptionHistory } from '~/routes/admin/-lib/subscription-history'
import {
  fetchActivityRows,
  fetchActivitySummary
} from '~/routes/admin/-server/activity'
import {
  resolveAuthProvider,
  SUBSCRIPTION_LIST_SELECT
} from '~/routes/admin/-server/users'
import { fetchCustomerBilling } from '~/server/stripe-billing.server'
import { adminRequiredMiddleware } from '~/server/user-auth'

const USER_IP_LIST_SIZE = 8

function buildUserActivityWhere(userId: string) {
  return {
    userId,
    createdAt: { gte: new Date(Date.now() - ACTIVITY_RETENTION_DAYS * DAY) }
  }
}

const USER_DETAIL_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  banned: true,
  banReason: true,
  createdAt: true,
  lastActiveAt: true,
  generationCount: true,
  premiumGrantedAt: true
} as const satisfies Prisma.UserSelect

export const getAdminUserDetail = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId }) => {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: USER_DETAIL_SELECT
    })

    if (!user) {
      throw notFound()
    }

    const [account, subscriptions, summary, ipGroups] = await Promise.all([
      prismaClient.account.findFirst({
        where: { userId },
        select: { providerId: true }
      }),
      prismaClient.subscription.findMany({
        where: { referenceId: userId },
        select: SUBSCRIPTION_LIST_SELECT
      }),
      fetchActivitySummary(buildUserActivityWhere(userId)),
      prismaClient.activityEvent.groupBy({
        by: ['ipAddress'],
        where: { userId, ipAddress: { not: null } },
        _count: { _all: true },
        _max: { createdAt: true, country: true },
        orderBy: { _max: { createdAt: 'desc' } },
        take: USER_IP_LIST_SIZE
      })
    ])

    const ipAddresses = ipGroups.flatMap((group) => {
      if (!group.ipAddress) {
        return []
      }

      return [
        {
          ipAddress: group.ipAddress,
          country: group._max.country,
          eventCount: group._count._all,
          lastSeenAt: group._max.createdAt
        }
      ]
    })

    return {
      user,
      provider: resolveAuthProvider(account?.providerId),
      subscription: buildSubscriptionInfo(subscriptions),
      summary,
      ipAddresses
    }
  })

export type AdminUserDetailPayload = Awaited<
  ReturnType<typeof getAdminUserDetail>
>

const USER_ACTIVITY_SCHEMA = ACTIVITY_PAGE_SCHEMA.extend({
  userId: z.string()
})

export type AdminUserActivityFilters = z.infer<typeof USER_ACTIVITY_SCHEMA>

export const getAdminUserActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(USER_ACTIVITY_SCHEMA)
  .handler(({ data }) => {
    return fetchActivityRows({
      where: buildUserActivityWhere(data.userId),
      page: data.page
    })
  })

const NO_STRIPE_BILLING = { subscriptions: [], invoices: [] }

export const getAdminUserSubscriptionHistory = createServerFn({
  method: 'GET'
})
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId }) => {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    })

    if (!user) {
      throw notFound()
    }

    const billing = user.stripeCustomerId
      ? await fetchCustomerBilling(user.stripeCustomerId)
      : NO_STRIPE_BILLING

    return buildSubscriptionHistory(billing)
  })

export type AdminUserSubscriptionHistory = Awaited<
  ReturnType<typeof getAdminUserSubscriptionHistory>
>
