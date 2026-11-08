import type { Stripe } from 'stripe'
import { type BillingPeriod, PREMIUM_PLAN_PRICING } from '~/constants/plan'

export type StripePriceIds = Record<BillingPeriod, string>

const CATALOG_CURRENCY = 'eur'

const CATALOG_INTERVALS = {
  monthly: 'month',
  yearly: 'year'
} as const satisfies Record<BillingPeriod, Stripe.Price.Recurring.Interval>

const BILLING_PERIODS = [
  'monthly',
  'yearly'
] as const satisfies readonly BillingPeriod[]

export async function readStripePriceContract(
  stripe: Stripe,
  priceIds: StripePriceIds
) {
  return Promise.all(
    BILLING_PERIODS.map(async (billingPeriod) => {
      const price = await stripe.prices.retrieve(priceIds[billingPeriod])

      return {
        billingPeriod,
        priceId: price.id,
        expected: {
          unitAmount: PREMIUM_PLAN_PRICING[billingPeriod].priceInCents,
          currency: CATALOG_CURRENCY,
          interval: CATALOG_INTERVALS[billingPeriod],
          active: true
        },
        actual: {
          unitAmount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? null,
          active: price.active
        }
      }
    })
  )
}
