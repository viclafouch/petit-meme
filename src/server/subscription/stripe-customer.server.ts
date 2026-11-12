import type { GenericEndpointContext, User } from 'better-auth'
import type { Stripe } from 'stripe'
import { LOCALE_SCHEMA } from '~/constants/locale'
import { stripeLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import type { Locale } from '~/paraglide/runtime'

export const buildStripeCustomerCreateParams = async (user: User) => {
  const result = LOCALE_SCHEMA.safeParse(user)

  return result.success ? { preferred_locales: [result.data.locale] } : {}
}

type UpdateStripeCustomerLocaleParams = {
  stripeClient: Stripe
  customerId: string
  locale: Locale
}

export const updateStripeCustomerLocale = async ({
  stripeClient,
  customerId,
  locale
}: UpdateStripeCustomerLocaleParams) => {
  try {
    await stripeClient.customers.update(customerId, {
      preferred_locales: [locale]
    })
  } catch (error) {
    captureWithFeature(error, 'stripe-customer-locale')
    stripeLogger.warn(
      { error, customerId, locale },
      'Failed to give the User locale to the Stripe customer'
    )
  }
}

type GiveUserLocaleToStripeCustomerParams = {
  stripeClient: Stripe
  endpointContext: GenericEndpointContext
  userId: string
  stripeSubscription: Stripe.Subscription
}

export const giveUserLocaleToStripeCustomer = async ({
  stripeClient,
  endpointContext,
  userId,
  stripeSubscription
}: GiveUserLocaleToStripeCustomerParams) => {
  const user = await endpointContext.context.adapter.findOne({
    model: 'user',
    where: [{ field: 'id', value: userId }]
  })
  const { locale } = LOCALE_SCHEMA.parse(user)
  const { customer } = stripeSubscription

  await updateStripeCustomerLocale({
    stripeClient,
    customerId: typeof customer === 'string' ? customer : customer.id,
    locale
  })
}
