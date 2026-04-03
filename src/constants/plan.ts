import { FREE_PLAN_MAX_AI_SEARCHES } from '~/constants/ai-search'
import { m } from '~/paraglide/messages.js'

export type BillingPeriod = 'monthly' | 'yearly'

export type PlanFeature = {
  label: string
  status: 'included' | 'limited' | 'not_included'
  note?: string
}

export type BetterAuthPlanName = 'free' | 'premium' | 'premium-annual'

export type PlanPricing = {
  priceInCents: number
  betterAuthPlanName: BetterAuthPlanName
}

export type Plan = {
  title: string
  maxGenerationsCount: number
  maxFavoritesCount: number
  maxAiSearchesCount: number
  productId: string
  description: string
  features: PlanFeature[]
  isExclusive?: boolean
  pricing: Record<BillingPeriod, PlanPricing>
}

export const FREE_PLAN_MAX_GENERATIONS = 3
export const FREE_PLAN_MAX_FAVORITES = 20

const FREE_PLAN_PRICING = {
  monthly: { priceInCents: 0, betterAuthPlanName: 'free' },
  yearly: { priceInCents: 0, betterAuthPlanName: 'free' }
} as const satisfies Record<BillingPeriod, PlanPricing>

const PREMIUM_PLAN_PRICING = {
  monthly: { priceInCents: 399, betterAuthPlanName: 'premium' },
  yearly: { priceInCents: 2999, betterAuthPlanName: 'premium-annual' }
} as const satisfies Record<BillingPeriod, PlanPricing>

export const PREMIUM_PLAN_PRODUCT_ID = 'f9395cde-98ed-4d06-9631-b9b9f0a64566'

export { PREMIUM_PLAN_PRICING }

export const getFreePlan = (): Plan => {
  return {
    title: m.plan_free_title(),
    maxGenerationsCount: FREE_PLAN_MAX_GENERATIONS,
    maxFavoritesCount: FREE_PLAN_MAX_FAVORITES,
    maxAiSearchesCount: FREE_PLAN_MAX_AI_SEARCHES,
    productId: 'free',
    isExclusive: false,
    description: m.plan_free_description(),
    features: [
      { label: m.plan_feature_public_memes(), status: 'included' },
      {
        label: m.plan_feature_favorites(),
        status: 'limited',
        note: m.plan_note_20_max()
      },
      {
        label: m.plan_feature_generations(),
        status: 'limited',
        note: m.plan_note_3_max()
      },
      { label: m.plan_feature_watermark(), status: 'limited' },
      {
        label: m.plan_feature_ai_search(),
        status: 'limited',
        note: m.plan_note_3_max()
      }
    ],
    pricing: FREE_PLAN_PRICING
  }
}

export const getPremiumPlan = (): Plan => {
  return {
    title: m.plan_premium_title(),
    maxGenerationsCount: Number.MAX_SAFE_INTEGER,
    maxFavoritesCount: Number.MAX_SAFE_INTEGER,
    maxAiSearchesCount: Number.MAX_SAFE_INTEGER,
    productId: PREMIUM_PLAN_PRODUCT_ID,
    isExclusive: true,
    description: m.plan_premium_description(),
    features: [
      { label: m.plan_feature_public_memes(), status: 'included' },
      {
        label: m.plan_feature_favorites(),
        status: 'included',
        note: m.plan_note_unlimited()
      },
      {
        label: m.plan_feature_generations(),
        status: 'included',
        note: m.plan_note_unlimited()
      },
      { label: m.plan_feature_no_watermark(), status: 'included' },
      {
        label: m.plan_feature_ai_search(),
        status: 'included',
        note: m.plan_note_unlimited()
      }
    ],
    pricing: PREMIUM_PLAN_PRICING
  }
}

export const getBillingPeriodLabel = (period: BillingPeriod) => {
  if (period === 'monthly') {
    return m.pricing_per_month()
  }

  return m.pricing_per_year()
}

export const ANNUAL_DISCOUNT_PERCENT = 37
