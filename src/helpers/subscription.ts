import type { Subscription } from '@better-auth/stripe'
import {
  type BillingPeriod,
  getBillingPeriodLabel,
  PREMIUM_PLAN_PRICING
} from '~/constants/plan'
import { formatCentsToEuros } from '~/helpers/number'
import type { Locale } from '~/paraglide/runtime'

export const getBillingPeriodFromInterval = (
  billingInterval: Subscription['billingInterval']
): BillingPeriod => {
  if (billingInterval === 'year') {
    return 'yearly'
  }

  return 'monthly'
}

type SubscriptionDisplayInfoParams = {
  billingInterval: Subscription['billingInterval']
  locale: Locale
}

export const getSubscriptionDisplayInfo = ({
  billingInterval,
  locale
}: SubscriptionDisplayInfoParams) => {
  const billingPeriod = getBillingPeriodFromInterval(billingInterval)
  const pricing = PREMIUM_PLAN_PRICING[billingPeriod]
  const formattedPrice = formatCentsToEuros(pricing.priceInCents, { locale })
  const periodLabel = getBillingPeriodLabel(billingPeriod)

  return {
    billingPeriod,
    displayPrice: `${formattedPrice}${periodLabel}`
  }
}
