import {
  type BetterAuthPlanName,
  BILLING_PERIOD_LABELS,
  type BillingPeriod,
  PREMIUM_PLAN
} from '@/constants/plan'
import { formatCentsToEuros } from '@/helpers/number'

export const getBillingPeriodFromPlan = (
  planName: BetterAuthPlanName
): BillingPeriod => {
  if (planName === PREMIUM_PLAN.pricing.yearly.betterAuthPlanName) {
    return 'yearly'
  }

  return 'monthly'
}

export const getSubscriptionDisplayInfo = (planName: BetterAuthPlanName) => {
  const billingPeriod = getBillingPeriodFromPlan(planName)
  const pricing = PREMIUM_PLAN.pricing[billingPeriod]
  const formattedPrice = formatCentsToEuros(pricing.priceInCents)
  const periodLabel = BILLING_PERIOD_LABELS[billingPeriod]

  return {
    billingPeriod,
    displayPrice: `${formattedPrice}${periodLabel}`
  }
}
