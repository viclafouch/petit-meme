import type { Stripe } from 'stripe'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { PaymentFailedEmail } from '~/emails/payment-failed-email'
import { emailSubjects } from '~/emails/subjects'
import { SubscriptionConfirmedEmail } from '~/emails/subscription-confirmed-email'
import { serverEnv } from '~/env/server.server'
import { formatCentsToEuros } from '~/helpers/number'
import {
  getSubscriptionPriceCents,
  matchIsYearlyInterval
} from '~/helpers/subscription'
import { stripeLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { sendEmailInBackground } from '~/server/platforms/resend.server'
import {
  getStripeClient,
  toBillingSubscription
} from '~/server/platforms/stripe.server'

type NotifySubscriptionConfirmedParams = {
  eventId: string
  userId: string
  planName: string
  billingInterval: string | null | undefined
  stripeSubscription: Stripe.Subscription
}

const USER_EMAIL_SELECT = {
  email: true,
  name: true,
  locale: true
} as const satisfies Prisma.UserSelect

const createBillingPortalUrl = async (customerId: string) => {
  const portalSession = await getStripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${serverEnv.VITE_SITE_URL}/settings`
  })

  return portalSession.url
}

export const notifyPaymentFailed = async (
  event: Stripe.InvoicePaymentFailedEvent
) => {
  const customerId = event.data.object.customer

  if (typeof customerId !== 'string') {
    return
  }

  stripeLogger.warn({ customerId, eventId: event.id }, 'Payment failed')

  const user = await prismaClient.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: USER_EMAIL_SELECT
  })

  if (!user) {
    stripeLogger.warn(
      { customerId, eventId: event.id },
      'Payment failed but user not found'
    )
    captureWithFeature(
      new Error(`Payment failed but user not found for customer ${customerId}`),
      'stripe-payment'
    )

    return
  }

  const billingPortalUrl = await createBillingPortalUrl(customerId).catch(
    (error: unknown) => {
      captureWithFeature(error, 'stripe-billing-portal')
      stripeLogger.error(
        { error, customerId, eventId: event.id },
        'Failed to create billing portal session'
      )

      return null
    }
  )

  if (billingPortalUrl === null) {
    return
  }

  sendEmailInBackground({
    to: user.email,
    subject: emailSubjects[user.locale].paymentFailed,
    react: PaymentFailedEmail({
      username: user.name,
      billingPortalUrl,
      locale: user.locale
    }),
    logMessage: 'Sending payment failed email to',
    idempotencyKey: `payment-failed/${event.id}`
  })
}

export const notifySubscriptionConfirmed = async ({
  eventId,
  userId,
  planName,
  billingInterval,
  stripeSubscription
}: NotifySubscriptionConfirmedParams) => {
  stripeLogger.info({ userId, plan: planName }, 'Subscription completed')

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: USER_EMAIL_SELECT
  })

  if (!user) {
    return
  }

  recordActivityEvent({
    type: ActivityEventType.SUBSCRIPTION,
    actor: { id: userId },
    metadata: {
      plan: planName,
      billingInterval
    }
  })

  const { interval } = toBillingSubscription(stripeSubscription)
  const { locale } = user

  sendEmailInBackground({
    to: user.email,
    subject: emailSubjects[locale].subscriptionConfirmed,
    react: SubscriptionConfirmedEmail({
      username: user.name,
      planTitle: 'Premium',
      amount: formatCentsToEuros(getSubscriptionPriceCents(interval), {
        locale
      }),
      isAnnual: matchIsYearlyInterval(interval),
      locale
    }),
    logMessage: 'Sending subscription confirmed email to',
    idempotencyKey: `subscription-confirmed/${eventId}`
  })
}
