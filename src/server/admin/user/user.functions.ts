import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import {
  ACTIVITY_PAGE_SCHEMA,
  ACTIVITY_RETENTION_DAYS
} from '~/constants/activity'
import { matchIsAuthProviderId, type AuthProviderId } from '~/constants/auth'
import { BAN_REASONS, type BanReason } from '~/constants/ban'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import type { Prisma, User } from '~/db/generated/prisma/client'
import { AccountBannedEmail } from '~/emails/account-banned-email'
import { AccountUnbannedEmail } from '~/emails/account-unbanned-email'
import { PremiumGrantedEmail } from '~/emails/premium-granted-email'
import { emailSubjects } from '~/emails/subjects'
import { buildSubscriptionInfo, type SubscriptionInfo } from '~/helpers/premium'
import { matchIsUserAdmin, matchIsUserBanned } from '~/helpers/role'
import { matchIsPremiumSubscriptionStatus } from '~/helpers/subscription'
import { buildSubscriptionHistory } from '~/helpers/subscription-history'
import { adminLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import {
  buildRetainedActivityWhere,
  findActivityRows,
  findActivitySummary
} from '~/server/admin/activity/activity.server'
import {
  logAuditAction,
  type AuditAction
} from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { auth } from '~/server/auth/auth.server'
import { throwWithStatus } from '~/server/http/http.server'
import { sendEmailInBackground } from '~/server/platforms/resend.server'
import {
  fetchCustomerBilling,
  getStripeClient
} from '~/server/platforms/stripe.server'
import { PREMIUM_SUBSCRIPTION_WHERE } from '~/server/subscription/subscription.server'

const USER_IP_LIST_SIZE = 8

const NO_STRIPE_BILLING = { subscriptions: [], invoices: [] }

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  banned: true,
  lastActiveAt: true,
  premiumGrantedAt: true
} as const satisfies Prisma.UserSelect

const SUBSCRIPTION_LIST_SELECT = {
  referenceId: true,
  status: true,
  billingInterval: true,
  periodEnd: true,
  cancelAt: true,
  cancelAtPeriodEnd: true,
  endedAt: true
} as const satisfies Prisma.SubscriptionSelect

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

const TARGET_USER_SELECT = {
  role: true,
  banned: true,
  email: true,
  name: true,
  locale: true,
  stripeCustomerId: true
} as const satisfies Prisma.UserSelect

const BAN_USER_SCHEMA = z.object({
  userId: z.string(),
  banReason: z.enum(BAN_REASONS)
})

const USER_ACTIVITY_SCHEMA = ACTIVITY_PAGE_SCHEMA.extend({
  userId: z.string()
})

export type AdminUserListItem = Prisma.UserGetPayload<{
  select: typeof USER_LIST_SELECT
}> & {
  provider: AuthProviderId
  subscription: SubscriptionInfo
}

export type AdminUserActivityFilters = z.infer<typeof USER_ACTIVITY_SCHEMA>

type RecordUserActionParams = {
  action: AuditAction
  adminId: string
  userId: string
  message: string
  banReason?: BanReason
}

type CancelSubscriptionAndNotifyBanParams = {
  bannedUser: Pick<User, 'email' | 'name' | 'locale' | 'stripeCustomerId'>
  banReason: BanReason
}

const resolveAuthProvider = (providerId?: string) => {
  return providerId !== undefined && matchIsAuthProviderId(providerId)
    ? providerId
    : 'credential'
}

const buildUserActivityWhere = (userId: string) => {
  return buildRetainedActivityWhere({ userId }, ACTIVITY_RETENTION_DAYS)
}

const rejectUserAction = (message: string) => {
  return throwWithStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT, new Error(message))
}

const findTargetUser = async (userId: string) => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: TARGET_USER_SELECT
  })

  if (!user) {
    return throwWithStatus(
      HTTP_STATUS.NOT_FOUND,
      new Error('Utilisateur introuvable')
    )
  }

  return user
}

const recordUserAction = ({
  action,
  adminId,
  userId,
  message,
  banReason
}: RecordUserActionParams) => {
  void logAuditAction({
    action,
    actingAdminId: adminId,
    targetId: userId,
    targetType: 'user',
    metadata: banReason === undefined ? undefined : { banReason }
  })

  adminLogger.info({ userId, adminId, banReason }, message)
}

const cancelPremiumSubscription = async (stripeCustomerId: string | null) => {
  if (!stripeCustomerId) {
    return false
  }

  try {
    const subscriptions = await getStripeClient().subscriptions.list({
      customer: stripeCustomerId
    })

    const premiumSubscription = subscriptions.data.find((subscription) => {
      return matchIsPremiumSubscriptionStatus(subscription.status)
    })

    if (!premiumSubscription) {
      return false
    }

    await getStripeClient().subscriptions.update(premiumSubscription.id, {
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

const cancelSubscriptionAndNotifyBan = async ({
  bannedUser,
  banReason
}: CancelSubscriptionAndNotifyBanParams) => {
  const hasActiveSubscription = await cancelPremiumSubscription(
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

export const listAdminUsers = createServerFn({ method: 'GET' })
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

    const [accounts, subscriptions] = await Promise.all([
      prismaClient.account.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, providerId: true }
      }),
      prismaClient.subscription.findMany({
        where: { referenceId: { in: userIds } },
        select: SUBSCRIPTION_LIST_SELECT
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

    return {
      users: users.map((user) => {
        return {
          ...user,
          provider: resolveAuthProvider(providerByUserId.get(user.id)),
          subscription: buildSubscriptionInfo(
            subscriptionsByUserId[user.id] ?? []
          )
        } satisfies AdminUserListItem
      })
    }
  })

export const getAdminUser = createServerFn({ method: 'GET' })
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
      findActivitySummary(buildUserActivityWhere(userId)),
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

export type AdminUser = Awaited<ReturnType<typeof getAdminUser>>

export const listAdminUserActivity = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(USER_ACTIVITY_SCHEMA)
  .handler(({ data }) => {
    return findActivityRows({
      where: buildUserActivityWhere(data.userId),
      page: data.page
    })
  })

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

export const banUser = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(BAN_USER_SCHEMA)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      return rejectUserAction('Impossible de vous bannir vous-même')
    }

    const targetUser = await findTargetUser(data.userId)

    if (matchIsUserBanned(targetUser)) {
      return rejectUserAction('Cet utilisateur est déjà banni')
    }

    if (matchIsUserAdmin(targetUser)) {
      return rejectUserAction('Impossible de bannir un administrateur')
    }

    const { headers } = getRequest()

    await Promise.all([
      auth.api.banUser({
        body: { userId: data.userId, banReason: data.banReason },
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

    recordUserAction({
      action: 'ban',
      adminId: context.user.id,
      userId: data.userId,
      banReason: data.banReason,
      message: 'User banned by admin'
    })

    return { success: true }
  })

export const unbanUser = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    const targetUser = await findTargetUser(userId)

    await auth.api.unbanUser({
      body: { userId },
      headers: getRequest().headers
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

    recordUserAction({
      action: 'unban',
      adminId: context.user.id,
      userId,
      message: 'User unbanned by admin'
    })

    return { success: true }
  })

export const deleteUser = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    if (userId === context.user.id) {
      return rejectUserAction('Impossible de supprimer votre propre compte')
    }

    const targetUser = await findTargetUser(userId)

    if (matchIsUserAdmin(targetUser)) {
      return rejectUserAction('Impossible de supprimer un administrateur')
    }

    await auth.api.removeUser({
      body: { userId },
      headers: getRequest().headers
    })

    recordUserAction({
      action: 'delete',
      adminId: context.user.id,
      userId,
      message: 'User removed by admin'
    })

    return { success: true }
  })

export const grantPremium = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    const targetUser = await findTargetUser(userId)

    if (matchIsUserAdmin(targetUser)) {
      return rejectUserAction('Un administrateur est déjà Premium')
    }

    if (matchIsUserBanned(targetUser)) {
      return rejectUserAction(
        "Impossible d'offrir Premium à un utilisateur banni"
      )
    }

    const premiumSubscriptionCount = await prismaClient.subscription.count({
      where: { ...PREMIUM_SUBSCRIPTION_WHERE, referenceId: userId }
    })

    if (premiumSubscriptionCount > 0) {
      return rejectUserAction('Abonnement payant en cours')
    }

    const { count } = await prismaClient.user.updateMany({
      where: { id: userId, premiumGrantedAt: null },
      data: { premiumGrantedAt: new Date() }
    })

    if (count === 0) {
      return rejectUserAction('Premium est déjà offert à cet utilisateur')
    }

    sendEmailInBackground({
      to: targetUser.email,
      subject: emailSubjects[targetUser.locale].premiumGranted,
      react: PremiumGrantedEmail({
        username: targetUser.name,
        locale: targetUser.locale
      }),
      logMessage: 'Sending premium granted email'
    })

    recordUserAction({
      action: 'premium_grant',
      adminId: context.user.id,
      userId,
      message: 'Premium granted by admin'
    })

    return { success: true }
  })

export const revokePremium = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator(z.string())
  .handler(async ({ data: userId, context }) => {
    const { count } = await prismaClient.user.updateMany({
      where: { id: userId, premiumGrantedAt: { not: null } },
      data: { premiumGrantedAt: null }
    })

    if (count === 0) {
      return rejectUserAction("Premium n'est pas offert à cet utilisateur")
    }

    recordUserAction({
      action: 'premium_revoke',
      adminId: context.user.id,
      userId,
      message: 'Premium revoked by admin'
    })

    return { success: true }
  })
