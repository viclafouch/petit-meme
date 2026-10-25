import { FREE_PLAN_MAX_AI_SEARCHES } from '~/constants/ai-search'
import { FREE_PLAN_MAX_FAVORITES, PREMIUM_PLAN_NAME } from '~/constants/plan'
import type { Meme, Subscription, User } from '~/db/generated/prisma/client'
import { E2E_FILLER_MEMES, E2E_NAMED_MEMES } from './content'

export const E2E_EMAIL_DOMAIN = 'e2e.petitmeme.invalid'
export const E2E_PASSWORD = 'e2e-password-2026'
export const E2E_WRONG_PASSWORD = 'not-the-e2e-password'

type E2eSubscription = Pick<Subscription, 'plan' | 'billingInterval'>

export type E2eRole = Pick<User, 'id' | 'name' | 'email' | 'emailVerified'> & {
  subscription?: E2eSubscription
  bookmarkedMemeIds?: readonly Meme['id'][]
  providerAvatar?: NonNullable<User['providerAvatar']>
  hasStripeCustomer?: boolean
  aiSearchCount?: number
}

const MONTHLY_PREMIUM_SUBSCRIPTION = {
  plan: PREMIUM_PLAN_NAME,
  billingInterval: 'month'
} as const satisfies E2eSubscription

const LEGACY_ANNUAL_PREMIUM_SUBSCRIPTION = {
  plan: 'premium-annual',
  billingInterval: 'year'
} as const satisfies E2eSubscription

const SELF_SERVED_NON_CATALOGUE_AVATAR_PATH = '/apple-touch-icon.png'

const CAPPED_BOOKMARK_MEME_IDS = E2E_FILLER_MEMES.slice(
  0,
  FREE_PLAN_MAX_FAVORITES
).map((meme) => {
  return meme.id
})

export const E2E_ROLES = {
  free: {
    id: 'e2e-user-free',
    name: 'E2E Free',
    email: `e2e-free@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  checkout: {
    id: 'e2e-user-checkout',
    name: 'E2E Checkout',
    email: `e2e-checkout@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    bookmarkedMemeIds: CAPPED_BOOKMARK_MEME_IDS
  },
  checkoutAnnual: {
    id: 'e2e-user-checkout-annual',
    name: 'E2E Checkout Annual',
    email: `e2e-checkout-annual@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  checkoutEnglish: {
    id: 'e2e-user-checkout-english',
    name: 'E2E Checkout English',
    email: `e2e-checkout-english@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  passwordReset: {
    id: 'e2e-user-password-reset',
    name: 'E2E Password Reset',
    email: `e2e-password-reset@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  deletion: {
    id: 'e2e-user-deletion',
    name: 'E2E Deletion',
    email: `e2e-deletion@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  deletionRefused: {
    id: 'e2e-user-deletion-refused',
    name: 'E2E Deletion Refused',
    email: `e2e-deletion-refused@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  premium: {
    id: 'e2e-user-premium',
    name: 'E2E Premium',
    email: `e2e-premium@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    subscription: MONTHLY_PREMIUM_SUBSCRIPTION
  },
  bookmark: {
    id: 'e2e-user-bookmark',
    name: 'E2E Bookmark',
    email: `e2e-bookmark@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  bookmarkCapped: {
    id: 'e2e-user-bookmark-capped',
    name: 'E2E Bookmark Capped',
    email: `e2e-bookmark-capped@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    bookmarkedMemeIds: CAPPED_BOOKMARK_MEME_IDS
  },
  avatar: {
    id: 'e2e-user-avatar',
    name: 'E2E Avatar',
    email: `e2e-avatar@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  avatarProvider: {
    id: 'e2e-user-avatar-provider',
    name: 'E2E Avatar Provider',
    email: `e2e-avatar-provider@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    providerAvatar: SELF_SERVED_NON_CATALOGUE_AVATAR_PATH
  },
  passwordUpdate: {
    id: 'e2e-user-password-update',
    name: 'E2E Password Update',
    email: `e2e-password-update@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  billingPortal: {
    id: 'e2e-user-billing-portal',
    name: 'E2E Billing Portal',
    email: `e2e-billing-portal@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    subscription: MONTHLY_PREMIUM_SUBSCRIPTION,
    hasStripeCustomer: true
  },
  favorites: {
    id: 'e2e-user-favorites',
    name: 'E2E Favorites',
    email: `e2e-favorites@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    bookmarkedMemeIds: [
      E2E_NAMED_MEMES.english.id,
      E2E_NAMED_MEMES.universal.id
    ]
  },
  submission: {
    id: 'e2e-user-submission',
    name: 'E2E Submission',
    email: `e2e-submission@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  aiSearch: {
    id: 'e2e-user-ai-search',
    name: 'E2E Ai Search',
    email: `e2e-ai-search@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  aiSearchNoResults: {
    id: 'e2e-user-ai-search-no-results',
    name: 'E2E Ai Search No Results',
    email: `e2e-ai-search-no-results@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true
  },
  aiSearchCapped: {
    id: 'e2e-user-ai-search-capped',
    name: 'E2E Ai Search Capped',
    email: `e2e-ai-search-capped@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    aiSearchCount: FREE_PLAN_MAX_AI_SEARCHES
  },
  aiSearchPremium: {
    id: 'e2e-user-ai-search-premium',
    name: 'E2E Ai Search Premium',
    email: `e2e-ai-search-premium@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    subscription: MONTHLY_PREMIUM_SUBSCRIPTION,
    aiSearchCount: FREE_PLAN_MAX_AI_SEARCHES
  },
  premiumAnnualLegacy: {
    id: 'e2e-user-premium-annual-legacy',
    name: 'E2E Premium Annual Legacy',
    email: `e2e-premium-annual-legacy@${E2E_EMAIL_DOMAIN}`,
    emailVerified: true,
    subscription: LEGACY_ANNUAL_PREMIUM_SUBSCRIPTION
  },
  unverified: {
    id: 'e2e-user-unverified',
    name: 'E2E Unverified',
    email: `e2e-unverified@${E2E_EMAIL_DOMAIN}`,
    emailVerified: false
  }
} as const satisfies Record<string, E2eRole>

export type E2eRoleName = keyof typeof E2E_ROLES

export const matchIsE2eRoleName = (name: string): name is E2eRoleName => {
  return Object.hasOwn(E2E_ROLES, name)
}

export const STRIPE_TEST_CARD = {
  number: '4242424242424242',
  expiry: '12/34',
  cvc: '123'
} as const satisfies Record<string, string>
