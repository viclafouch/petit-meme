import { prismaClient } from '@/db'
import { emailSubjects } from '@/emails/subjects'
import { authLogger } from '@/lib/logger'
import { sendEmailAsync } from '@/lib/resend'
import { captureWithFeature } from '@/lib/sentry'
import { stripeClient } from '@/lib/stripe'
import type { Locale } from '@/paraglide/runtime'
import { createServerOnlyFn } from '@tanstack/react-start'
import AccountDeletedEmail from '../emails/account-deleted-email'

type CleanupUserDataParams = {
  userId: string
  email: string
  name: string
  locale: Locale
}

export const cleanupUserData = createServerOnlyFn(
  async ({ userId, email, name, locale }: CleanupUserDataParams) => {
    authLogger.info({ userId, email }, 'Account deletion cleanup initiated')

    sendEmailAsync({
      to: email,
      subject: emailSubjects[locale].accountDeleted,
      react: <AccountDeletedEmail username={name} locale={locale} />,
      logMessage: 'Sending account deleted email to'
    })

    const dbUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    })

    if (dbUser?.stripeCustomerId) {
      try {
        await stripeClient.customers.del(dbUser.stripeCustomerId)
      } catch (error) {
        captureWithFeature(error, 'delete-account')
        authLogger.warn(
          { err: error, stripeCustomerId: dbUser.stripeCustomerId, userId },
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
