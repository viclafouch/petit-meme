import type { GenericEndpointContext, User } from 'better-auth'
import { Stripe } from 'stripe'
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

const matchIsMissingStripeCustomer = (error: unknown) => {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === 'resource_missing'
  )
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

    return true
  } catch (error) {
    if (matchIsMissingStripeCustomer(error)) {
      stripeLogger.warn(
        { customerId },
        'The Stripe customer is missing, its locale is left as is'
      )

      return true
    }

    captureWithFeature(error, 'stripe-customer-locale')
    stripeLogger.warn(
      { error, customerId, locale },
      'Failed to give the User locale to the Stripe customer'
    )

    return false
  }
}

type GiveUserLocaleToSignUpStripeCustomerParams = {
  stripeClient: Stripe
  stripeCustomer: Stripe.Customer
  user: User
}

export const giveUserLocaleToSignUpStripeCustomer = async ({
  stripeClient,
  stripeCustomer,
  user
}: GiveUserLocaleToSignUpStripeCustomerParams) => {
  const result = LOCALE_SCHEMA.safeParse(user)

  if (
    !result.success ||
    stripeCustomer.preferred_locales?.[0] === result.data.locale
  ) {
    return
  }

  await updateStripeCustomerLocale({
    stripeClient,
    customerId: stripeCustomer.id,
    locale: result.data.locale
  })
}

type GiveUserLocaleToCheckoutStripeCustomerParams = {
  stripeClient: Stripe
  endpointContext: GenericEndpointContext
  userId: string
  stripeSubscription: Stripe.Subscription
}

export const giveUserLocaleToCheckoutStripeCustomer = async ({
  stripeClient,
  endpointContext,
  userId,
  stripeSubscription
}: GiveUserLocaleToCheckoutStripeCustomerParams) => {
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
