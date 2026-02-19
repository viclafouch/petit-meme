import Stripe from 'stripe'
import { serverEnv } from '@/env/server'

export const stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover'
})
