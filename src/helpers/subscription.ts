import {
  type BetterAuthPlanName,
  type BillingPeriod,
  getBillingPeriodLabel,
  PREMIUM_PLAN_PRICING
} from '~/constants/plan'
import { formatCentsToEuros } from '~/helpers/number'
import type { Locale } from '~/paraglide/runtime'

export const getBillingPeriodFromPlan = (
  planName: BetterAuthPlanName
): BillingPeriod => {
  if (planName === PREMIUM_PLAN_PRICING.yearly.betterAuthPlanName) {
    return 'yearly'
  }

  return 'monthly'
}

type SubscriptionDisplayInfoParams = {
  planName: BetterAuthPlanName
  locale: Locale
}

export const getSubscriptionDisplayInfo = ({
  planName,
  locale
}: SubscriptionDisplayInfoParams) => {
  const billingPeriod = getBillingPeriodFromPlan(planName)
  const pricing = PREMIUM_PLAN_PRICING[billingPeriod]
  const formattedPrice = formatCentsToEuros(pricing.priceInCents, { locale })
  const periodLabel = getBillingPeriodLabel(billingPeriod)

  return {
    billingPeriod,
    displayPrice: `${formattedPrice}${periodLabel}`
  }
}
