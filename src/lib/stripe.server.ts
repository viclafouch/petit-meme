import { Stripe } from 'stripe'
import { STRIPE_API_VERSION } from '~/constants/stripe'
import { serverEnv } from '~/env/server.server'

let stripeClient: Stripe | null = null

export const getStripeClient = () => {
  stripeClient ??= new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  })

  return stripeClient
}
