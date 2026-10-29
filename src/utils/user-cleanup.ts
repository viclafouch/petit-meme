import { createServerOnlyFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import { AccountDeletedEmail } from '~/emails/account-deleted-email'
import { emailSubjects } from '~/emails/subjects'
import { authLogger } from '~/lib/logger'
import { sendEmailInBackground } from '~/lib/resend'
import { captureWithFeature } from '~/lib/sentry'
import { getStripeClient } from '~/lib/stripe'
import type { Locale } from '~/paraglide/runtime'

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
      logMessage: 'Sending account deleted email to'
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
