import { createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db/client.server'
import { AccountDeletedEmail } from '~/emails/account-deleted-email'
import { emailSubjects } from '~/emails/subjects'
import { authLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import type { Locale } from '~/paraglide/runtime'
import { sendEmailInBackground } from '~/server/platforms/resend.server'
import { getStripeClient } from '~/server/platforms/stripe.server'
import { updateStripeCustomerLocale } from '~/server/subscription/stripe-customer.server'

type CleanupUserDataParams = {
  userId: string
  email: string
  name: string
  locale: Locale
}

export const cleanupUserData = createServerOnlyFn(
  async ({ userId, email, name, locale }: CleanupUserDataParams) => {
    authLogger.info({ userId, email }, 'Account deletion cleanup initiated')

    sendEmailInBackground({
      to: email,
      subject: emailSubjects[locale].accountDeleted,
      react: AccountDeletedEmail({ username: name, locale }),
      logMessage: 'Sending account deleted email to',
      idempotencyKey: `account-deleted/${userId}`
    })

    const dbUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    })

    if (dbUser?.stripeCustomerId) {
      try {
        await getStripeClient().customers.del(dbUser.stripeCustomerId)
      } catch (error) {
        captureWithFeature(error, 'delete-account')
        authLogger.warn(
          { error, stripeCustomerId: dbUser.stripeCustomerId, userId },
          'Failed to delete Stripe customer (may already be deleted)'
        )
      }
    }

    await prismaClient.subscription.deleteMany({
      where: { referenceId: userId }
    })

    await prismaClient.adminAuditLog.updateMany({
      where: { targetId: userId },
      data: { targetId: '[deleted]' }
    })
  }
)

type SyncUserLocaleParams = {
  userId: string
  locale: Locale
}

export const syncUserLocale = createServerOnlyFn(
  async ({ userId, locale }: SyncUserLocaleParams) => {
    const [changedUser] = await prismaClient.user.updateManyAndReturn({
      where: { id: userId, NOT: { locale } },
      data: { locale },
      select: { stripeCustomerId: true }
    })

    if (!changedUser?.stripeCustomerId) {
      return
    }

    await updateStripeCustomerLocale({
      stripeClient: getStripeClient(),
      customerId: changedUser.stripeCustomerId,
      locale
    })
  }
)
