import { isDeepStrictEqual } from 'node:util'
import { serverEnv } from '~/env/server.server'
import { getStripeClient } from '~/server/platforms/stripe.server'
import { readStripePriceContract } from './lib/stripe-price-contract'

const checkStripePrices = async () => {
  const results = await readStripePriceContract(getStripeClient(), {
    monthly: serverEnv.STRIPE_MONTHLY_PRICE_ID,
    yearly: serverEnv.STRIPE_ANNUAL_PRICE_ID
  })

  const drifts = results.filter(({ expected, actual }) => {
    return !isDeepStrictEqual(expected, actual)
  })

  for (const { billingPeriod, priceId, expected, actual } of results) {
    console.log(
      isDeepStrictEqual(expected, actual)
        ? `✓ ${billingPeriod} (${priceId})`
        : `✗ ${billingPeriod} (${priceId}): Stripe holds ${JSON.stringify(actual)}, the catalog expects ${JSON.stringify(expected)}`
    )
  }

  console.log(
    drifts.length === 0
      ? '\nStripe matches the catalog.'
      : `\nStripe drifts from the catalog on ${drifts.length} price(s).`
  )

  process.exit(drifts.length === 0 ? 0 : 1)
}

void checkStripePrices()
