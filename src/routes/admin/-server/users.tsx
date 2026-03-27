import { z } from 'zod'
import { prismaClient } from '~/db'
import type { Prisma } from '~/db/generated/prisma/client'
import { AccountBannedEmail } from '~/emails/account-banned-email'
import { AccountUnbannedEmail } from '~/emails/account-unbanned-email'
import { emailSubjects } from '~/emails/subjects'
import { auth } from '~/lib/auth'
import { adminLogger } from '~/lib/logger'
import { sendEmailAsync } from '~/lib/resend'
import { captureWithFeature } from '~/lib/sentry'
import { stripeClient } from '~/lib/stripe'
import { logAuditAction } from '~/server/audit'
import { adminRequiredMiddleware } from '~/server/user-auth'
import { cleanupUserData } from '~/utils/user-cleanup'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  banned: true
} as const satisfies Prisma.UserSelect

export type SubscriptionStatus = 'active' | 'past' | 'none'

const SUBSCRIPTION_LIST_SELECT = {
  referenceId: true,
  status: true,
  periodStart: true,
  periodEnd: true
} as const satisfies Prisma.SubscriptionSelect

type SubscriptionRow = Prisma.SubscriptionGetPayload<{
  select: typeof SUBSCRIPTION_LIST_SELECT
}>

export type SubscriptionInfo = {
  status: SubscriptionStatus
  startedAt: SubscriptionRow['periodStart']
  endsAt: SubscriptionRow['periodEnd']
}

export type EnrichedUser = Prisma.UserGetPayload<{
  select: typeof USER_LIST_SELECT
}> & {
  provider: 'twitter' | 'credential'
  subscription: SubscriptionInfo
  bookmarkCount: number
  generationCount: number
  lastActivityAt: Date | null
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

    const [
      accounts,
      subscriptions,
      bookmarkCounts,
      lastSessions,
      generationCounts
    ] = await Promise.all([
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
      prismaClient.session.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          expiresAt: { gte: new Date() }
        },
        _max: { updatedAt: true }
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

    const subscriptionByUserId = new Map<string, SubscriptionInfo>()

    for (const sub of subscriptions) {
      const current = subscriptionByUserId.get(sub.referenceId)
      const subStatus = sub.status === 'active' ? 'active' : 'past'

      if (!current) {
        subscriptionByUserId.set(sub.referenceId, {
          status: subStatus,
          startedAt: sub.periodStart,
          endsAt: sub.periodEnd
        })
        continue
      }

      subscriptionByUserId.set(sub.referenceId, {
        status:
          current.status !== 'active' && subStatus === 'active'
            ? 'active'
            : current.status,
        startedAt:
          sub.periodStart &&
          (!current.startedAt || sub.periodStart < current.startedAt)
            ? sub.periodStart
            : current.startedAt,
        endsAt:
          sub.periodEnd && (!current.endsAt || sub.periodEnd > current.endsAt)
            ? sub.periodEnd
            : current.endsAt
      })
    }

    const bookmarkCountByUserId = new Map(
      bookmarkCounts.map((group) => {
        return [group.userId, group._count.id] as const
      })
    )

    const lastActivityByUserId = new Map(
      lastSessions.map((group) => {
        return [group.userId, group._max.updatedAt] as const
      })
    )

    const generationCountByUserId = new Map(
      generationCounts.map((group) => {
        return [group.userId, group._count.id] as const
      })
    )

    const enrichedUsers = users.map((user) => {
      const provider = providerByUserId.get(user.id)

      return {
        ...user,
        provider: provider === 'twitter' ? 'twitter' : 'credential',
        subscription: subscriptionByUserId.get(user.id) ?? {
          status: 'none',
          startedAt: null,
          endsAt: null
        },
        bookmarkCount: bookmarkCountByUserId.get(user.id) ?? 0,
        generationCount: generationCountByUserId.get(user.id) ?? 0,
        lastActivityAt: lastActivityByUserId.get(user.id) ?? null
      } satisfies EnrichedUser
    })

    return { users: enrichedUsers }
  })

export const BAN_REASONS = [
  'Spam',
  'Contenu inapproprié',
  'Harcèlement',
  "Usurpation d'identité",
  'Autre'
] as const satisfies readonly string[]

export type BanReason = (typeof BAN_REASONS)[number]

const BAN_USER_SCHEMA = z.object({
  userId: z.string(),
  banReason: z.enum(BAN_REASONS)
})

const cancelActiveSubscription = async (stripeCustomerId: string | null) => {
  if (!stripeCustomerId) {
    return false
  }

  try {
    const subscriptions = await stripeClient.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1
    })

    const activeSubscription = subscriptions.data[0]

    if (!activeSubscription) {
      return false
    }

    await stripeClient.subscriptions.update(activeSubscription.id, {
      // eslint-disable-next-line camelcase -- Stripe API property
      cancel_at_period_end: true
    })

    return true
  } catch (error) {
    captureWithFeature(error, 'admin-ban')
    adminLogger.error(
      { err: error, stripeCustomerId },
      'Failed to cancel Stripe subscription on ban'
    )

    return false
  }
}

export const banUserById = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator(BAN_USER_SCHEMA)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      setResponseStatus(422)
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
      setResponseStatus(404)
      throw new Error('Utilisateur introuvable')
    }

    if (targetUser.banned === true) {
      setResponseStatus(422)
      throw new Error('Cet utilisateur est déjà banni')
    }

    if (targetUser.role === 'admin') {
      setResponseStatus(422)
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

    void cancelActiveSubscription(targetUser.stripeCustomerId).then(
      (hasActiveSubscription) => {
        sendEmailAsync({
          to: targetUser.email,
          subject: emailSubjects[targetUser.locale].accountBanned,
          react: (
            <AccountBannedEmail
              username={targetUser.name}
              banReason={data.banReason}
              hasActiveSubscription={hasActiveSubscription}
              locale={targetUser.locale}
            />
          ),
          logMessage: 'Sending ban notification email'
        })
      }
    )

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
  .inputValidator(z.string())
  .handler(async ({ data: userId, context }) => {
    const targetUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, locale: true }
    })

    if (!targetUser) {
      setResponseStatus(404)
      throw new Error('Utilisateur introuvable')
    }

    const { headers } = getRequest()

    await auth.api.unbanUser({
      body: { userId },
      headers
    })

    sendEmailAsync({
      to: targetUser.email,
      subject: emailSubjects[targetUser.locale].accountUnbanned,
      react: (
        <AccountUnbannedEmail
          username={targetUser.name}
          locale={targetUser.locale}
        />
      ),
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
  .inputValidator(z.string())
  .handler(async ({ data: userId, context }) => {
    if (userId === context.user.id) {
      setResponseStatus(422)
      throw new Error('Impossible de supprimer votre propre compte')
    }

    const targetUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, name: true, locale: true }
    })

    if (!targetUser) {
      setResponseStatus(404)
      throw new Error('Utilisateur introuvable')
    }

    if (targetUser.role === 'admin') {
      setResponseStatus(422)
      throw new Error('Impossible de supprimer un administrateur')
    }

    await cleanupUserData({
      userId,
      email: targetUser.email,
      name: targetUser.name,
      locale: targetUser.locale
    })

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
