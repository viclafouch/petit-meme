import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { prismaClient } from '~/db'
import { matchIsAuthProviderId, type AuthProviderId } from '~/constants/auth'
import { HTTP_STATUS } from '~/constants/http'
import type { Prisma, User } from '~/db/generated/prisma/client'
import { AccountBannedEmail } from '~/emails/account-banned-email'
import { AccountUnbannedEmail } from '~/emails/account-unbanned-email'
import { emailSubjects } from '~/emails/subjects'
import { differenceInMonths } from '~/helpers/date'
import { auth } from '~/lib/auth'
import { adminLogger } from '~/lib/logger'
import { sendEmailInBackground } from '~/lib/resend'
import { captureWithFeature } from '~/lib/sentry'
import { getStripeClient } from '~/lib/stripe'
import { BAN_REASONS, type BanReason } from '~/routes/admin/-lib/ban'
import { logAuditAction } from '~/server/audit'
import { adminRequiredMiddleware } from '~/server/user-auth'

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  banned: true,
  lastActiveAt: true
} as const satisfies Prisma.UserSelect

export type SubscriptionStatus = 'active' | 'past' | 'none'

export const SUBSCRIPTION_LIST_SELECT = {
  referenceId: true,
  status: true,
  periodStart: true,
  periodEnd: true
} as const satisfies Prisma.SubscriptionSelect

type SubscriptionRow = Prisma.SubscriptionGetPayload<{
  select: typeof SUBSCRIPTION_LIST_SELECT
}>

type SubscriptionPeriod = {
  status: SubscriptionStatus
  startedAt: SubscriptionRow['periodStart']
  endsAt: SubscriptionRow['periodEnd']
}

export type SubscriptionInfo = SubscriptionPeriod & {
  monthCount: number
}

const NO_SUBSCRIPTION: SubscriptionPeriod = {
  status: 'none',
  startedAt: null,
  endsAt: null
}

const countSubscribedMonths = (startedAt: SubscriptionPeriod['startedAt']) => {
  return startedAt
    ? Math.max(1, differenceInMonths(new Date(), new Date(startedAt)))
    : 1
}

export function buildSubscriptionInfo(
  subscriptions: SubscriptionRow[]
): SubscriptionInfo {
  const period = subscriptions.reduce<SubscriptionPeriod>(
    (merged, subscription) => {
      const isActive = subscription.status === 'active'

      return {
        status: merged.status === 'active' || isActive ? 'active' : 'past',
        startedAt:
          subscription.periodStart &&
          (!merged.startedAt || subscription.periodStart < merged.startedAt)
            ? subscription.periodStart
            : merged.startedAt,
        endsAt:
          subscription.periodEnd &&
          (!merged.endsAt || subscription.periodEnd > merged.endsAt)
            ? subscription.periodEnd
            : merged.endsAt
      }
    },
    NO_SUBSCRIPTION
  )

  return { ...period, monthCount: countSubscribedMonths(period.startedAt) }
}

export function resolveAuthProvider(providerId?: string) {
  return providerId !== undefined && matchIsAuthProviderId(providerId)
    ? providerId
    : 'credential'
}

export type EnrichedUser = Prisma.UserGetPayload<{
  select: typeof USER_LIST_SELECT
}> & {
  provider: AuthProviderId
  subscription: SubscriptionInfo
  bookmarkCount: number
  generationCount: number
}

export const getListUsers = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => {
    const users = await prismaClient.user.findMany({
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 500
    })

    const userIds = users.map((user) => {
      return user.id
    })

    const [accounts, subscriptions, bookmarkCounts, generationCounts] =
      await Promise.all([
        prismaClient.account.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, providerId: true }
        }),
        prismaClient.subscription.findMany({
          where: { referenceId: { in: userIds } },
          select: SUBSCRIPTION_LIST_SELECT
        }),
        prismaClient.userBookmark.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { id: true }
        }),
        prismaClient.studioGeneration.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { id: true }
        })
      ])

    const providerByUserId = new Map(
      accounts.map((account) => {
        return [account.userId, account.providerId] as const
      })
    )

    const subscriptionsByUserId = Object.groupBy(
      subscriptions,
      (subscription) => {
        return subscription.referenceId
      }
    )

    const bookmarkCountByUserId = new Map(
      bookmarkCounts.map((group) => {
        return [group.userId, group._count.id] as const
      })
    )

    const generationCountByUserId = new Map(
      generationCounts.map((group) => {
        return [group.userId, group._count.id] as const
      })
    )

    const enrichedUsers = users.map((user) => {
      return {
        ...user,
        provider: resolveAuthProvider(providerByUserId.get(user.id)),
        subscription: buildSubscriptionInfo(
          subscriptionsByUserId[user.id] ?? []
        ),
        bookmarkCount: bookmarkCountByUserId.get(user.id) ?? 0,
        generationCount: generationCountByUserId.get(user.id) ?? 0
      } satisfies EnrichedUser
    })

    return { users: enrichedUsers }
  })

const BAN_USER_SCHEMA = z.object({
  userId: z.string(),
  banReason: z.enum(BAN_REASONS)
})

const cancelActiveSubscription = async (stripeCustomerId: string | null) => {
  if (!stripeCustomerId) {
    return false
  }

  try {
    const subscriptions = await getStripeClient().subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1
    })

    const activeSubscription = subscriptions.data[0]

    if (!activeSubscription) {
      return false
    }

    await getStripeClient().subscriptions.update(activeSubscription.id, {
      cancel_at_period_end: true
    })

    return true
  } catch (error) {
    captureWithFeature(error, 'admin-ban')
    adminLogger.error(
      { error, stripeCustomerId },
      'Failed to cancel Stripe subscription on ban'
    )

    return false
  }
}

type CancelSubscriptionAndNotifyBanParams = {
  bannedUser: Pick<User, 'email' | 'name' | 'locale' | 'stripeCustomerId'>
  banReason: BanReason
}

const cancelSubscriptionAndNotifyBan = async ({
  bannedUser,
  banReason
}: CancelSubscriptionAndNotifyBanParams) => {
  const hasActiveSubscription = await cancelActiveSubscription(
    bannedUser.stripeCustomerId
  )

  sendEmailInBackground({
    to: bannedUser.email,
    subject: emailSubjects[bannedUser.locale].accountBanned,
    react: AccountBannedEmail({
      username: bannedUser.name,
      banReason,
      hasActiveSubscription,
      locale: bannedUser.locale
    }),
    logMessage: 'Sending ban notification email'
  })
}

export const banUserById = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(BAN_USER_SCHEMA)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
      throw new Error('Impossible de vous bannir vous-même')
    }

    const targetUser = await prismaClient.user.findUnique({
      where: { id: data.userId },
      select: {
        role: true,
        email: true,
        name: true,
        locale: true,
        stripeCustomerId: true,
        banned: true
      }
    })

    if (!targetUser) {
      setResponseStatus(HTTP_STATUS.NOT_FOUND)
      throw new Error('Utilisateur introuvable')
    }

    if (targetUser.banned === true) {
      setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
      throw new Error('Cet utilisateur est déjà banni')
    }

    if (targetUser.role === 'admin') {
      setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
      throw new Error('Impossible de bannir un administrateur')
    }

    const { headers } = getRequest()

    await Promise.all([
      auth.api.banUser({
        body: {
          userId: data.userId,
          banReason: data.banReason
        },
        headers
      }),
      auth.api.revokeUserSessions({
        body: { userId: data.userId },
        headers
      })
    ])

    void cancelSubscriptionAndNotifyBan({
      bannedUser: targetUser,
      banReason: data.banReason
    })

    void logAuditAction({
      action: 'ban',
      actingAdminId: context.user.id,
      targetId: data.userId,
      targetType: 'user',
      metadata: { banReason: data.banReason }
    })

    adminLogger.info(
      {
        userId: data.userId,
        adminId: context.user.id,
        banReason: data.banReason
      },
      'User banned by admin'
    )

    return { success: true }
  })

export const unbanUserById = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    const targetUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, locale: true }
    })

    if (!targetUser) {
      setResponseStatus(HTTP_STATUS.NOT_FOUND)
      throw new Error('Utilisateur introuvable')
    }

    const { headers } = getRequest()

    await auth.api.unbanUser({
      body: { userId },
      headers
    })

    sendEmailInBackground({
      to: targetUser.email,
      subject: emailSubjects[targetUser.locale].accountUnbanned,
      react: AccountUnbannedEmail({
        username: targetUser.name,
        locale: targetUser.locale
      }),
      logMessage: 'Sending unban notification email'
    })

    void logAuditAction({
      action: 'unban',
      actingAdminId: context.user.id,
      targetId: userId,
      targetType: 'user'
    })

    adminLogger.info(
      { userId, adminId: context.user.id },
      'User unbanned by admin'
    )

    return { success: true }
  })

export const removeUser = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    if (userId === context.user.id) {
      setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
      throw new Error('Impossible de supprimer votre propre compte')
    }

    const targetUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!targetUser) {
      setResponseStatus(HTTP_STATUS.NOT_FOUND)
      throw new Error('Utilisateur introuvable')
    }

    if (targetUser.role === 'admin') {
      setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
      throw new Error('Impossible de supprimer un administrateur')
    }

    const { headers } = getRequest()

    await auth.api.removeUser({
      body: { userId },
      headers
    })

    void logAuditAction({
      action: 'delete',
      actingAdminId: context.user.id,
      targetId: userId,
      targetType: 'user'
    })

    adminLogger.info(
      { userId, adminId: context.user.id },
      'User removed by admin'
    )

    return { success: true }
  })
