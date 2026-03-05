import {
  type BetterAuthPlanName,
  BILLING_PERIOD_LABELS,
  type BillingPeriod,
  PREMIUM_PLAN
} from '@/constants/plan'
import { formatCentsToEuros } from '@/helpers/number'
import type { Locale } from '@/paraglide/runtime'

export const getBillingPeriodFromPlan = (
  planName: BetterAuthPlanName
): BillingPeriod => {
  if (planName === PREMIUM_PLAN.pricing.yearly.betterAuthPlanName) {
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
  const pricing = PREMIUM_PLAN.pricing[billingPeriod]
  const formattedPrice = formatCentsToEuros(pricing.priceInCents, { locale })
  const periodLabel = BILLING_PERIOD_LABELS[billingPeriod]

  return {
    billingPeriod,
    displayPrice: `${formattedPrice}${periodLabel}`
  }
}
