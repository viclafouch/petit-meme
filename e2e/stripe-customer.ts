import { prismaClient } from '~/db/client.server'
import { getStripeClient } from '~/server/platforms/stripe.server'

export const findStripeCustomerLocales = async (userId: string) => {
  const { stripeCustomerId } = await prismaClient.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true }
  })

  if (!stripeCustomerId) {
    return null
  }

  const customer = await getStripeClient().customers.retrieve(stripeCustomerId)

  return customer.deleted ? null : customer.preferred_locales
}
