import type { Subscription } from '@better-auth/stripe'
import { FREE_CAPS } from '~/helpers/cap'
import { m } from '~/paraglide/messages.js'

export type BillingPeriod = 'monthly' | 'yearly'

type PlanFeature = {
  label: string
  status: 'included' | 'limited' | 'not_included'
  note?: string
}

export const PREMIUM_PLAN_NAME = 'premium'

export const STRIPE_BILLING_INTERVALS = [
  'day',
  'week',
  'month',
  'year'
] as const satisfies readonly NonNullable<Subscription['billingInterval']>[]

type PlanPricing = {
  priceInCents: number
}

export type Plan = {
  title: string
  maxGenerationsCount: number
  maxBookmarksCount: number
  maxAiSearchesCount: number
  productId: string
  description: string
  features: PlanFeature[]
  isExclusive?: boolean
  pricing: Record<BillingPeriod, PlanPricing>
}

const FREE_PLAN_PRICING = {
  monthly: { priceInCents: 0 },
  yearly: { priceInCents: 0 }
} as const satisfies Record<BillingPeriod, PlanPricing>

const PREMIUM_PLAN_PRICING = {
  monthly: { priceInCents: 399 },
  yearly: { priceInCents: 2999 }
} as const satisfies Record<BillingPeriod, PlanPricing>

const PREMIUM_PLAN_PRODUCT_ID = 'f9395cde-98ed-4d06-9631-b9b9f0a64566'

export { PREMIUM_PLAN_PRICING }

export const getFreePlan = (): Plan => {
  return {
    title: m.plan_free_title(),
    maxGenerationsCount: FREE_CAPS.generation,
    maxBookmarksCount: FREE_CAPS.bookmark,
    maxAiSearchesCount: FREE_CAPS.aiSearch,
    productId: 'free',
    isExclusive: false,
    description: m.plan_free_description(),
    features: [
      { label: m.plan_feature_public_memes(), status: 'included' },
      {
        label: m.plan_feature_bookmarks(),
        status: 'limited',
        note: m.plan_note_20_max()
      },
      {
        label: m.plan_feature_generations(),
        status: 'limited',
        note: m.plan_note_3_max()
      },
      { label: m.plan_feature_watermark(), status: 'limited' },
      { label: m.plan_feature_audio_download(), status: 'not_included' },
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
    maxBookmarksCount: Number.MAX_SAFE_INTEGER,
    maxAiSearchesCount: Number.MAX_SAFE_INTEGER,
    productId: PREMIUM_PLAN_PRODUCT_ID,
    isExclusive: true,
    description: m.plan_premium_description(),
    features: [
      { label: m.plan_feature_public_memes(), status: 'included' },
      {
        label: m.plan_feature_bookmarks(),
        status: 'included',
        note: m.plan_note_unlimited()
      },
      {
        label: m.plan_feature_generations(),
        status: 'included',
        note: m.plan_note_unlimited()
      },
      { label: m.plan_feature_no_watermark(), status: 'included' },
      { label: m.plan_feature_audio_download(), status: 'included' },
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

export const PREMIUM_REMINDER_STORAGE_KEY = 'premium-reminder-dismissed-at'
export const PREMIUM_REMINDER_DELAY_MS = 5000
