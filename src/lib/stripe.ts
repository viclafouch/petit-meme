import { Stripe } from 'stripe'
import { serverEnv } from '~/env/server'

let stripeClient: Stripe | null = null

export const getStripeClient = () => {
  stripeClient ??= new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: '2026-08-26.dahlia'
  })

  return stripeClient
}
