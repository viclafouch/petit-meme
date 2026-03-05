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
  productId: string
  description: string
  features: PlanFeature[]
  isExclusive?: boolean
  pricing: Record<BillingPeriod, PlanPricing>
}

export const FREE_PLAN = {
  title: 'Testeur',
  maxGenerationsCount: 3,
  maxFavoritesCount: 20,
  productId: 'free',
  isExclusive: false,
  description:
    'Testez gratuitement et sans limite de temps. Découvrez les mèmes, créez vos premiers contenus et enregistrez vos favoris sans sortir la carte bleue.',
  features: [
    { label: 'Accès aux mèmes publics', status: 'included' },
    { label: 'Favoris enregistrés', status: 'limited', note: '20 max' },
    {
      label: 'Générations de vidéos',
      status: 'limited',
      note: '3 max'
    }
  ],
  pricing: {
    monthly: { priceInCents: 0, betterAuthPlanName: 'free' },
    yearly: { priceInCents: 0, betterAuthPlanName: 'free' }
  }
} as const satisfies Plan

export const PREMIUM_PLAN = {
  title: 'Premium',
  maxGenerationsCount: Number.MAX_SAFE_INTEGER,
  maxFavoritesCount: Number.MAX_SAFE_INTEGER,
  productId: 'f9395cde-98ed-4d06-9631-b9b9f0a64566',
  isExclusive: true,
  description:
    "Passez en mode illimité. Créez autant de vidéos que vous voulez, sauvegardez tous vos favoris et profitez d'une expérience sans aucune restriction.",
  features: [
    { label: 'Accès aux mèmes publics', status: 'included' },
    { label: 'Favoris enregistrés', status: 'included', note: 'illimité' },
    {
      label: 'Générations de vidéos',
      status: 'included',
      note: 'illimité'
    }
  ],
  pricing: {
    monthly: { priceInCents: 399, betterAuthPlanName: 'premium' },
    yearly: { priceInCents: 2999, betterAuthPlanName: 'premium-annual' }
  }
} as const satisfies Plan

export const BILLING_PERIOD_LABELS = {
  monthly: '/mois',
  yearly: '/an'
} as const satisfies Record<BillingPeriod, string>

export const ANNUAL_DISCOUNT_PERCENT = 37
